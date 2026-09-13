import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { guides, sources, reviewDate } from '../src/guides/content.mjs';
import { parse } from 'parse5';
import { elements, attr, text } from '../src/seo/html.mjs';
const { routes } = JSON.parse(fs.readFileSync('.portal-planejamento/rotas.json', 'utf8'));
test('dez guias correspondem exatamente ao mapa aprovado', () => {
  assert.equal(guides.length, 10);
  assert.deepEqual(guides.map(guide => `/guias/${guide.slug}/`).sort(), routes.filter(route => route.group === 'guide').map(route => route.url).sort());
  assert.equal(new Set(guides.map(guide => guide.title)).size, 10);
});
test('todos os guias possuem procedimento e exemplos distintos', () => {
  for (const guide of guides) {
    assert.equal(guide.sections.length, 4);
    assert.equal(guide.sections.filter(section => section.steps?.length === 4).length, 1);
    assert.equal(new Set(guide.sections.map(section => section.id)).size, 4);
    assert.ok(fs.existsSync(`_portal/guides/${guide.image}`));
    assert.ok(guide.caption.length > 40);
  }
  assert.equal(new Set(guides.map(guide => JSON.stringify(guide.sections))).size, 10);
});
test('fontes primarias e relacoes validas sem autor humano ficticio', () => {
  for (const guide of guides) {
    assert.ok(routes.some(route => route.url === `/${guide.tool}/` && route.group === 'tool'));
    for (const slug of guide.related) assert.ok(guides.some(other => other.slug === slug && other !== guide));
    for (const key of guide.sources) assert.ok(/^(developer\.mozilla\.org|mediabunny\.dev)$/.test(new URL(sources[key].url).hostname));
    const html = fs.readFileSync(`guias/${guide.slug}/index.html`, 'utf8');
    assert.ok(html.includes('Revis&atilde;o editorial humana: pendente'));
    assert.ok(html.includes('noindex, nofollow'));
  }
});
test('cada ferramenta inclui ao menos um link editorial', () => {
  for (const slug of new Set(guides.map(guide => guide.tool))) {
    const html = fs.readFileSync(`${slug}/index.html`, 'utf8');
    assert.ok(html.includes('class="guide-connections"'));
    for (const guide of guides.filter(guide => guide.tool === slug)) assert.ok(html.includes(`../guias/${guide.slug}/index.html`));
  }
});

test('guias renderizados nao ensinam controles retirados e usam a data atual', () => {
  assert.equal(reviewDate, '2026-09-13');
  for (const guide of guides) {
    const tree = parse(fs.readFileSync(`guias/${guide.slug}/index.html`, 'utf8'));
    const article = elements(tree, node => node.tagName === 'article')[0];
    assert.doesNotMatch(text(article), /Abra (Converter para MP4|V[i\u00ed]deo para WhatsApp)|Meta de tamanho|Preparar v[i\u00ed]deo|Compartilhar arquivo|Reempacotar sem recomprimir/i);
    assert.equal(elements(tree, node => attr(node, 'data-retired-notice') !== undefined).length, 0);
    assert.equal(attr(elements(tree, node => node.tagName === 'time')[0], 'datetime'), reviewDate);
    assert.match(text(elements(tree, node => node.tagName === 'time')[0]), /13\/09\/2026/);
    assert.equal(text(elements(tree, node => node.tagName === 'h1')[0]), text(parse(`<h1>${guide.title}</h1>`)).trim());
    for (const a of elements(tree, node => node.tagName === 'a')) assert.doesNotMatch(attr(a, 'href') ?? '', /^\.\.\/\.\.\/(video-para-whatsapp|converter-para-mp4)\//);
  }
});

test('procedimentos explicam a selecao recomendada, previa do corte e duracao do audio', () => {
  const content = slug => text(parse(fs.readFileSync(`guias/${slug}/index.html`, 'utf8')));
  assert.match(content('como-remover-metadados-de-video'), /Selecionar dados pessoais e dispositivo/);
  assert.match(content('como-remover-metadados-de-video'), /escolha manual/);
  assert.match(content('como-cortar-video-no-celular'), /Reproduzir trecho/);
  assert.match(content('como-cortar-video-no-celular'), /Qualidade do trecho/);
  assert.match(content('como-extrair-audio-de-video'), /pr\u00f3pria trilha de \u00e1udio/);
  assert.match(content('como-extrair-audio-de-video'), /sem acrescentar sil\u00eancio/);
});

test('sobre videos tem perguntas atuais com links editoriais existentes', () => {
  const tree = parse(fs.readFileSync('index.html', 'utf8'));
  const section = elements(tree, node => attr(node, 'id') === 'sobre-videos')[0];
  assert.equal(text(elements(section, node => node.tagName === 'h2')[0]), 'Sobre v\u00eddeos.');
  assert.equal(elements(section, node => node.tagName === 'details').length, 7);
  assert.match(text(section), /Reproduzir trecho/);
  assert.match(text(section), /WAV e M4A/);
  for (const link of elements(section, node => node.tagName === 'a')) {
    assert.match(attr(link, 'href'), /^guias\/[^/]+\/index\.html$/);
    assert.ok(fs.existsSync(attr(link, 'href')));
  }
});

test('gerador editorial reutiliza capturas atuais e conexoes validam ferramentas ativas', () => {
  const builder = fs.readFileSync('scripts/build-guides.mjs', 'utf8');
  assert.doesNotMatch(builder, /spawnSync|etapa5-|etapa6-/);
  assert.match(builder, /new Set\(guides\.map\(guide => guide\.image\)\)/);
  assert.match(builder, /group === 'tool'/);
  const connector = fs.readFileSync('scripts/connect-guides.mjs', 'utf8');
  assert.match(connector, /sourceCodeLocation/);
  assert.match(connector, /group === 'tool'/);
});
