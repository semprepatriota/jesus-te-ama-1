import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'parse5';

const nodes = [];
function visit(node) {
  nodes.push(node);
  for (const child of node.childNodes || []) visit(child);
}
visit(parse(fs.readFileSync('index.html', 'utf8')));
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const byId = id => nodes.find(node => attr(node, 'id') === id);

test('home destaca metadados como escolha inicial e conserva sete ferramentas', () => {
  const options = byId('selected-tool').childNodes.filter(node => node.tagName === 'option');
  assert.equal(options.length, 7);
  assert.equal(new Set(options.map(node => attr(node, 'value'))).size, 7);
  assert.equal(attr(options[0], 'value'), 'limpar-metadados-video');
  assert.equal(attr(options[0], 'selected'), '');
  assert.equal(attr(byId('tool-link'), 'href'), 'limpar-metadados-video/index.html');
  assert.equal(attr(byId('selected-icon'), 'src'), '_portal/icons/shield-check.svg');
  const cards = nodes.filter(node => attr(node, 'class')?.split(' ').includes('tool-card'));
  assert.equal(cards.length, 7);
  assert.equal(attr(cards[0], 'href'), 'limpar-metadados-video/index.html');
  assert.ok(attr(cards[0], 'class').split(' ').includes('featured-tool'));
  assert.equal(cards.filter(node => attr(node, 'class').split(' ').includes('featured-tool')).length, 1);
  assert.equal(cards.filter(node => attr(node, 'href') === 'comprimir-video/index.html').length, 1);
  assert.deepEqual(cards.map(node => attr(node, 'href')).sort(), options.map(node => `${attr(node, 'value')}/index.html`).sort());
});
