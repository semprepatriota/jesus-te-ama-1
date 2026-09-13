import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parse as yaml } from 'yaml';
import { parse } from 'parse5';
import { prepareHtml, sitemap, robots, elements, attr, text } from '../src/seo/html.mjs';
import { packageFiles, publicBytes } from '../src/release/inventory.mjs';
import { verifyPublic } from '../scripts/verify-public.mjs';
import { spawnSync } from 'node:child_process';
const { routes } = JSON.parse(fs.readFileSync('.portal-planejamento/rotas.json', 'utf8'));
const rules = JSON.parse(fs.readFileSync('.portal-planejamento/regras.json', 'utf8'));
const origin = rules.canonicalOrigin;
test('pacote normaliza CRLF/LF sem alterar os arquivos originais', () => {
  const input = Buffer.from('<p>Exemplo</p>\r\n'); const copy = Buffer.from(input);
  assert.equal(publicBytes('index.html', input).toString(), '<p>Exemplo</p>\n'); assert.deepEqual(input, copy);
  assert.deepEqual(publicBytes('index.html', input), publicBytes('index.html', '<p>Exemplo</p>\n'));
});
test('videos, imagens e fontes preservam todos os bytes binarios', () => {
  const bytes = Buffer.from([0, 13, 10, 255, 128, 9]);
  for (const file of ['amostra.mp4', 'imagem.jpg', 'fonte.ttf']) assert.deepEqual(publicBytes(file, bytes), bytes);
});
test('SEO e idempotente e preserva corpo e rodape de todas as paginas', () => {
  for (const route of routes.filter(route => route.group !== 'error')) {
    const html = fs.readFileSync(route.file, 'utf8'), prepared = prepareHtml(html, route);
    assert.equal(prepared, html); assert.equal(prepared.slice(prepared.indexOf('</head>')), html.slice(html.indexOf('</head>')));
  }
});
test('modo de producao tem canonical/robots coerentes e schema sem avaliacoes inventadas', () => {
  for (const route of routes.filter(route => route.group !== 'error')) {
    const tree = parse(prepareHtml(fs.readFileSync(route.file, 'utf8'), route, { production: true }));
    const canonical = elements(tree, node => node.tagName === 'link' && attr(node, 'rel') === 'canonical'); assert.equal(canonical.length, 1); assert.equal(attr(canonical[0], 'href'), origin + route.url);
    const meta = elements(tree, node => node.tagName === 'meta' && attr(node, 'name') === 'robots'); assert.equal(attr(meta[0], 'content'), 'index, follow');
    const graph = JSON.parse(text(elements(tree, node => node.tagName === 'script' && attr(node, 'type') === 'application/ld+json')[0])); assert.equal(graph.url, origin + route.url); assert.ok(!graph.aggregateRating && !graph.offers && !graph.author);
  }
});
test('sitemap de producao inclui somente as 26 canonicas, nunca alias ou 404', () => {
  const xml = sitemap(routes, origin, true); assert.equal((xml.match(/<loc>/g) ?? []).length, 26);
  for (const route of routes) assert.equal(xml.includes(`<loc>${origin}${route.url}</loc>`), route.indexable);
  assert.ok(!xml.includes('funil') && !xml.includes('LP1_') && !xml.includes('lastmod'));
  assert.equal(robots(origin, true), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  assert.equal((sitemap(routes, origin, false).match(/<loc>/g) ?? []).length, 0); assert.ok(robots(origin, false).includes('Disallow: /'));
});
test('pacote publico e allowlist estrita e exclui desenvolvimento, backups e midias antigas', () => {
  const files = packageFiles(routes, rules.compatibilityAliases, false); assert.equal(new Set(files).size, files.length);
  assert.ok(files.every(file => !/^media\/|\.portal-planejamento|node_modules|^src\/|^scripts\/|\.pdf$|\.map$|ASSETS.md/.test(file)));
  assert.ok(!files.includes('404.html') && !files.includes('ads.txt'));
});
test('workflow tem validacao automatica e deploy manual com gate antes de upload dist', () => {
  const workflow = yaml(fs.readFileSync('.github/workflows/static.yml', 'utf8'));
  assert.equal(workflow.on.workflow_dispatch.inputs.release.default, false); assert.equal(workflow.jobs.deploy.needs, 'validate'); assert.ok(workflow.jobs.deploy.if.includes("workflow_dispatch") && workflow.jobs.deploy.if.includes('inputs.release == true'));
  assert.equal(workflow.permissions.pages, undefined);
  const steps = workflow.jobs.deploy.steps, upload = steps.findIndex(step => step.uses?.startsWith('actions/upload-pages-artifact@'));
  assert.equal(steps[upload].with.path, 'dist'); assert.ok(steps.slice(0, upload).some(step => step.run?.includes('verificar.mjs publicacao'))); assert.ok(steps.slice(0, upload).some(step => step.run?.includes('verify-public.mjs --production')));
  assert.ok(workflow.jobs.validate.steps.some(step => step.run === 'npm test'));
});
test('build de producao bloqueia dependencias antes de alterar dist', () => {
  const result = spawnSync(process.execPath, ['scripts/build-public.mjs', '--production'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0); assert.ok((result.stdout + result.stderr).includes('Etapas anteriores pendentes'));
});
test('verificador nao aceita pacote adulterado ou com arquivos internos', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-public-fixture-'));
  assert.equal(path.dirname(folder), path.resolve(os.tmpdir()));
  assert.ok(path.basename(folder).startsWith('hf-public-fixture-'));
  fs.mkdirSync(path.join(folder, '.portal-planejamento')); fs.writeFileSync(path.join(folder, '.portal-planejamento/segredo.txt'), 'ficticio');
  assert.throws(() => verifyPublic(folder), /Inventario/);
  fs.rmSync(folder, { recursive: true });
});
