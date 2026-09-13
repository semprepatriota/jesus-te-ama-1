import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { guides, sources } from '../src/guides/content.mjs';
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
