import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'parse5';
import { elements, attr } from '../src/seo/html.mjs';
import { audioDuration, validAudioDuration } from '../src/media/audio-policy.js';
import { metadataAdvice, recommendedFields } from '../src/media/metadata-advice.js';
const { routes } = JSON.parse(fs.readFileSync('.portal-planejamento/rotas.json','utf8'));

test('audio usa intervalo da trilha, nao duracao total do video', () => {
  assert.equal(audioDuration({ start: 0, end: 2 }), 2);
  assert.equal(audioDuration({ start: 3, end: 5 }), 2);
  assert.equal(audioDuration({ start: -.02, end: 2 }), 2);
  for (const value of [null, {}, {start:0,end:0}, {start:3,end:2}]) assert.throws(() => audioDuration(value));
  assert.ok(validAudioDuration(2.02,2));
  assert.equal(validAudioDuration(6,2),false);
  for (const value of [NaN,Infinity,0]) assert.equal(validAudioDuration(value,2),false);
});

test('sugestoes distinguem dados pessoais de descricao e campos desconhecidos', () => {
  const fields = [{id:'raw:location',label:'GPS'}, {id:'artist',label:'Autor'}, {id:'date',label:'Data'}, {id:'raw:©too',label:'©too'}, {id:'title',label:'Titulo'}, {id:'raw:unknown',label:'Desconhecido'}];
  assert.deepEqual(recommendedFields(fields),fields.slice(0,4).map(field => field.id));
  assert.equal(metadataAdvice(fields[5]).category,'Campo nao classificado');
});

test('ferramentas retiradas nao possuem editor nem links de acesso publico', () => {
  for (const route of routes) {
    const html = fs.readFileSync(route.file,'utf8'), tree = parse(html);
    if (route.group === 'retired') {
      assert.equal(route.indexable,false);
      assert.equal(route.adsCandidate,false);
      assert.equal(elements(tree,node => attr(node,'id') === 'tool-root').length,0);
      assert.ok(html.includes('0;url=../index.html'));
    } else for (const link of elements(tree,node => node.tagName === 'a')) assert.ok(!/(video-para-whatsapp|converter-para-mp4)\/(index\.html)?$/.test(attr(link,'href') || ''),route.file);
  }
});
