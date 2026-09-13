import test from 'node:test';
import assert from 'node:assert/strict';
import { BoundedOutput } from '../src/media/bounded-output.js';
import { LIMITS, validateFile, validateMetadata, exportSettings } from '../src/media/policy.js';
import { VideoEngine } from '../src/media/client.js';

const metadata = { width: 1920, height: 1080, duration: 6, frameRate: 30, hdr: false, audio: { channels: 2 } };
const file = new Blob(['local video']);
function harness(limits = {}) {
  const workers = [];
  const engine = new VideoEngine({ limits, workerFactory() {
    const worker = { terminated: false, postMessage(message) { this.message = message; }, terminate() { this.terminated = true; }, send(type, value) { this.onmessage({ data: { id: this.message.id, type, value } }); } };
    workers.push(worker); return worker;
  } });
  return { engine, workers };
}
async function ready(h) { const promise = h.engine.open(file); h.workers.at(-1).send('result', metadata); await promise; }

test('positional patches and cross-block writes retain exact bytes', async () => {
  const output = new BoundedOutput(32, 4);
  output.write({ position: 0, data: new Uint8Array([1, 2, 3, 4, 5]) });
  output.write({ position: 2, data: new Uint8Array([8, 9, 10, 11]) });
  assert.deepEqual([...new Uint8Array(await output.toBlob().arrayBuffer())], [1, 2, 8, 9, 10, 11]);
  output.dispose(); assert.equal(output.blocks.size, 0);
});
test('sparse output contains zero-filled holes', async () => {
  const output = new BoundedOutput(32, 4);
  output.write({ position: 6, data: new Uint8Array([7]) });
  assert.deepEqual([...new Uint8Array(await output.toBlob().arrayBuffer())], [0, 0, 0, 0, 0, 0, 7]);
});
test('output limit rejects before allocation', () => {
  const output = new BoundedOutput(4, 4);
  assert.throws(() => output.write({ position: 3, data: new Uint8Array(2) }), { code: 'OUTPUT_LIMIT' });
  assert.equal(output.blocks.size, 0);
});
test('empty and oversized input rejected', () => {
  assert.throws(() => validateFile(new Blob()), { code: 'INVALID_FILE' });
  assert.throws(() => validateFile(file, { inputBytes: 2 }), { code: 'INPUT_LIMIT' });
});
for (const [field, value, code] of [['duration', 121, 'DURATION_LIMIT'], ['duration', NaN, 'INVALID_DURATION'], ['width', 4096, 'RESOLUTION_LIMIT'], ['frameRate', 120, 'FRAME_RATE_LIMIT'], ['height', 0, 'INVALID_DIMENSIONS'], ['audio', { channels: 6 }, 'AUDIO_CHANNEL_LIMIT']]) {
  test(`metadata guard ${code}`, () => assert.throws(() => validateMetadata({ ...metadata, [field]: value }), { code }));
}
test('settings shrink only and remain even; HDR is never silently converted', () => {
  assert.deepEqual(exportSettings(metadata), { mode: 'transcode', width: 1280, height: 720, bitrate: 2000000 });
  assert.equal(exportSettings({ ...metadata, width: 641, height: 361 }).width, 640);
  assert.throws(() => exportSettings({ ...metadata, hdr: true }), { code: 'HDR_UNSUPPORTED' });
  assert.equal(exportSettings({ ...metadata, hdr: true }, { mode: 'copy' }).mode, 'copy');
  assert.throws(() => exportSettings(metadata, { bitrate: 1 }), { code: 'INVALID_OPTIONS' });
});
test('one job at a time and progress is forwarded', async () => {
  const h = harness(); await ready(h);
  const promise = h.engine.exportMp4();
  await assert.rejects(h.engine.exportMp4(), { code: 'BUSY' });
  h.workers.at(-1).send('progress', { progress: .5, processedSeconds: 3, stage: 'converting' });
  assert.equal(h.engine.state.progress, .5);
  h.workers.at(-1).send('result', { blob: file, metadata }); await promise;
  assert.equal(h.engine.state.phase, 'done'); assert.equal(h.engine.resources().workers, 0);
});
test('cancel terminates worker and ignores late replies', async () => {
  const h = harness(); await ready(h);
  const promise = h.engine.exportMp4(); const worker = h.workers.at(-1);
  h.engine.cancel(); await assert.rejects(promise, { code: 'CANCELLED' });
  worker.send('result', { blob: file }); worker.send('progress', { progress: 1 });
  assert.equal(worker.terminated, true); assert.equal(h.engine.state.phase, 'cancelled');
  assert.deepEqual(h.engine.resources(), { workers: 0, pending: 0, urls: 0, retainedOutputBytes: 0 });
});
test('new file cancels analysis and a stale result cannot overwrite metadata', async () => {
  const h = harness(); const first = h.engine.open(file); const old = h.workers.at(-1);
  const second = h.engine.open(new Blob(['next video']));
  await assert.rejects(first, { code: 'CANCELLED' });
  old.send('result', { ...metadata, width: 1 });
  h.workers.at(-1).send('result', { ...metadata, width: 640 }); await second;
  assert.equal(h.engine.state.metadata.width, 640);
});
test('retry after error works; simulated memory failure cleans worker', async () => {
  const h = harness(); await ready(h);
  const promise = h.engine.exportMp4(); h.workers.at(-1).send('error', { code: 'MEMORY_LIMIT', message: 'Injected memory failure' });
  await assert.rejects(promise, { code: 'MEMORY_LIMIT' });
  assert.equal(h.engine.resources().workers, 0);
  const retry = h.engine.retry(); h.workers.at(-1).send('result', metadata); await retry;
  assert.equal(h.engine.state.phase, 'ready');
});
test('deadline aborts and releases resources', async () => {
  const h = harness({ timeoutMs: 10 });
  await assert.rejects(h.engine.open(file), { code: 'TIME_LIMIT' });
  assert.equal(h.workers[0].terminated, true); assert.equal(h.engine.resources().pending, 0);
});
test('validated download URL is reused then revoked on reset', async () => {
  const h = harness(); await ready(h);
  assert.throws(() => h.engine.downloadUrl(), { code: 'NOT_READY' });
  const promise = h.engine.exportMp4(); h.workers.at(-1).send('result', { blob: file }); await promise;
  const url = h.engine.downloadUrl(); assert.equal(url, h.engine.downloadUrl());
  assert.equal(h.engine.resources().urls, 1); h.engine.dispose();
  assert.equal(h.engine.resources().urls, 0); assert.equal(h.engine.state.metadata, null);
});
test('limits are immutable defaults', () => assert.equal(Object.isFrozen(LIMITS), true));
