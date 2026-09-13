import test from 'node:test';
import assert from 'node:assert/strict';
import { compressionOptions, whatsappOptions, comparison, MAX_ATTEMPTS } from '../src/tools/presets.js';
test('compressor tem tres niveis e altura validada', () => {
  assert.equal(compressionOptions('small', 480).bitrate, 700000);
  assert.equal(compressionOptions('balanced', 720).bitrate, 1500000);
  assert.equal(compressionOptions('high', 1080).bitrate, 3000000);
  assert.throws(() => compressionOptions('unknown', 720));
  assert.throws(() => compressionOptions('small', 2160));
});
test('meta considera duracao e reserva de audio', () => {
  const silent = whatsappOptions({ duration: 120 }, 4, 720);
  const sound = whatsappOptions({ duration: 120, audio: {} }, 4, 720);
  assert.ok(sound.bitrate < silent.bitrate); assert.equal(sound.targetBytes, 4194304);
});
test('segunda tentativa reduz bitrate e limita altura', () => {
  const first = whatsappOptions({ duration: 35, audio: {} }, 4, 720);
  const second = whatsappOptions({ duration: 35, audio: {} }, 4, 720, { bitrate: first.bitrate, outputBytes: 5000000 });
  assert.ok(second.bitrate < first.bitrate); assert.equal(second.maxHeight, 480); assert.equal(MAX_ATTEMPTS, 2);
});
test('bitrate fica nos limites suportados do motor', () => {
  assert.equal(whatsappOptions({ duration: 1 }, 16, 720).bitrate, 2500000);
  assert.equal(whatsappOptions({ duration: 120, audio: {} }, 4, 480, { bitrate: 100000, outputBytes: 10000000 }).bitrate, 100000);
});
test('metas invalidas e tentativas corrompidas sao recusadas', () => {
  assert.throws(() => whatsappOptions({ duration: 0 }, 4, 480));
  assert.throws(() => whatsappOptions({ duration: 10 }, 2, 480));
  assert.throws(() => whatsappOptions({ duration: 10 }, 4, 480, { bitrate: 1, outputBytes: 0 }));
});
test('comparacao usa tamanho real, inclusive crescimento', () => {
  assert.deepEqual(comparison(1000, 500, 400), { reduced: true, percent: 50, targetMet: false });
  assert.equal(comparison(1000, 1200).reduced, false);
  assert.equal(comparison(1000, 1000, 1000).targetMet, true);
  assert.throws(() => comparison(1000, 0));
});
