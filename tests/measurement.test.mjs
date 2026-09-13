import test from 'node:test';
import assert from 'node:assert/strict';
import { createMeasurement, failureCategory, toolNames } from '../src/measurement/controller.js';
import { measurementConfig, advertisingConfig } from '../src/measurement/config.js';
const tool = toolNames[0];
test('contas e anuncios permanecem desativados sem identificadores ficticios', () => {
  assert.deepEqual(measurementConfig, { enabled: false, provider: null, measurementId: null });
  assert.deepEqual(advertisingConfig, { enabled: false, approved: false, publisherId: null });
});
test('desativado: aceitar nao liga medicao, nao coleta nem acumula eventos', () => {
  const events = [], control = createMeasurement({ send: event => events.push(event) });
  control.setPreference('granted'); control.open(tool); const token = control.start(tool); control.finish(token, 'success');
  assert.equal(control.preference, 'denied'); assert.deepEqual(events, []);
});
test('padrao negado: nao ha ping nem repeticao de eventos anteriores ao aceite', () => {
  const events = [], control = createMeasurement({ enabled: true, send: event => events.push(event) });
  control.open(tool); const deniedJob = control.start(tool); control.setPreference('granted'); control.finish(deniedJob, 'success');
  assert.deepEqual(events, []); control.open(tool); control.open(tool);
  assert.deepEqual(events, [{ event: 'hf_tool_open', tool }]);
});
test('um inicio e um resultado por trabalho; falhas sao categorias fechadas', () => {
  const events = [], control = createMeasurement({ enabled: true, send: event => events.push(event) });
  control.setPreference('granted'); const token = control.start(tool); control.finish(token, 'failure', 'nome-arquivo GPS WhatsApp'); control.finish(token, 'success');
  assert.deepEqual(events, [{ event: 'hf_tool_start', tool }, { event: 'hf_tool_failure', tool, category: 'processing' }]);
});
test('recusar durante trabalho impede terminal mesmo apos novo aceite', () => {
  const events = [], control = createMeasurement({ enabled: true, send: event => events.push(event) });
  control.setPreference('granted'); const token = control.start(tool); control.setPreference('denied'); control.setPreference('granted'); control.finish(token, 'success');
  assert.equal(events.length, 1);
});
test('cancelar/reset sem trabalho nao duplica; tokens antigos nao encerram o novo', () => {
  const events = [], control = createMeasurement({ enabled: true, send: event => events.push(event) }); control.setPreference('granted');
  const first = control.start(tool), next = control.start(tool); control.finish(first, 'success'); control.finish(next, 'cancel'); control.finish(next, 'cancel');
  assert.deepEqual(events.map(event => event.event), ['hf_tool_start', 'hf_tool_cancel', 'hf_tool_start', 'hf_tool_cancel']);
});
test('dados livres, URLs e objetos nao entram no payload', () => {
  const events = [], control = createMeasurement({ enabled: true, send: event => events.push(event) }); control.setPreference('granted');
  control.open('https://example.com/?whatsapp=123'); assert.equal(control.start({ filename: 'video.mp4' }), null);
  for (const tool of toolNames) { const token = control.start(tool); control.finish(token, 'success', { gps: 1 }); }
  assert.equal(events.length, 14); assert.ok(events.every(event => Object.keys(event).sort().join(',') === 'event,tool'));
});
test('erro no coletor nao interfere na ferramenta; dispose descarta o trabalho', () => {
  const control = createMeasurement({ enabled: true, send: () => { throw new Error('offline'); } }); control.setPreference('granted');
  const token = control.start(tool); assert.doesNotThrow(() => control.finish(token, 'success')); control.dispose(); assert.equal(control.preference, 'denied');
});
test('mensagem e metadados de erro nao sao retidos pela classificacao', () => {
  assert.equal(failureCategory('UNSUPPORTED_CODEC'), 'unsupported'); assert.equal(failureCategory('SIZE_LIMIT'), 'limit'); assert.equal(failureCategory('TIMEOUT'), 'timeout');
  assert.equal(failureCategory({ message: 'contato privado' }), 'processing'); assert.equal(failureCategory('nome-do-arquivo.mp4'), 'processing');
});
