import test from 'node:test';
import assert from 'node:assert/strict';
import { metadataFields, removeMetadata, cutRange } from '../src/media/metadata-policy.js';
test('campo normalizado nao duplica alias bruto na lista',()=>{
  const fields=metadataFields({title:'Privado',raw:{'\u00a9nam':'Privado','com.apple.quicktime.location.ISO6709':'+1+2/'}});
  assert.equal(fields.length,2); assert.equal(fields[0].id,'title');
});
test('remocao seletiva apaga aliases e preserva nao escolhidos',()=>{
  const tags={title:'Privado',artist:'Preservar',date:new Date('2020-01-01'),raw:{'\u00a9nam':'Privado','com.apple.quicktime.title':'Privado','\u00a9ART':'Preservar'}};
  const clean=removeMetadata(tags,['title']);
  assert.equal(clean.title,undefined); assert.equal(clean.raw['\u00a9nam'],undefined); assert.equal(clean.raw['com.apple.quicktime.title'],undefined); assert.equal(clean.artist,'Preservar'); assert.equal(tags.title,'Privado');
});
test('selecao bruta remove normalizacao correspondente',()=>{
  const clean=removeMetadata({raw:{'com.apple.quicktime.creationdate':'2020'}},['raw:com.apple.quicktime.creationdate']);
  assert.equal(clean.raw['com.apple.quicktime.creationdate'],undefined);
});
test('capas dependem de escolha explicita',()=>{
  const tags={title:'A',images:[{data:new Uint8Array([1,2])}],raw:{covr:new Uint8Array([1,2])}};
  assert.equal(removeMetadata(tags,['title']).images.length,1);
  assert.equal(removeMetadata(tags,['images']).images,undefined);
  assert.equal(removeMetadata(tags,['images']).raw.covr,undefined);
});
test('selecao vazia, desconhecida e duplicada sao rejeitadas',()=>{
  for(const selected of [[],['inventado'],['title','title']]) assert.throws(()=>removeMetadata({title:'A'},selected),{code:'INVALID_SELECTION'});
});
test('metadados excessivos nao sao ocultados silenciosamente',()=>{
  assert.throws(()=>metadataFields({title:'a'.repeat(4097)}),{code:'METADATA_LIMIT'});
});
test('chaves que parecem propriedades de prototipo continuam campos brutos',()=>{
  const fields=metadataFields({raw:JSON.parse('{"__proto__":"valor","constructor":"outro"}')});
  assert.deepEqual(fields.map(field=>field.id),['raw:__proto__','raw:constructor']);
});
test('intervalos invertidos, curtos e fora do video sao rejeitados',()=>{
  for(const options of [{start:2,end:1},{start:0,end:7},{start:-1,end:2},{start:1,end:1.1},{start:NaN,end:2}]) assert.throws(()=>cutRange(options,6),{code:'INVALID_RANGE'});
  assert.deepEqual(cutRange({start:1.23,end:4.56},6),{start:1.23,end:4.56});
  assert.deepEqual(cutRange({start:.1,end:.3},6),{start:.1,end:.3});
});
