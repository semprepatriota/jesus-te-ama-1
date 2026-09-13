import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'parse5';
import { parse as yaml } from 'yaml';
import { indexedToolUrls, canIndexRoute, requireIndexedToolsApproval } from '../src/seo/indexing.mjs';
import { prepareHtml, sitemap, robots, elements, attr } from '../src/seo/html.mjs';
import { verifyPreviewAuthorization } from '../src/release/preview-authorization.mjs';
const rules = JSON.parse(fs.readFileSync('.portal-planejamento/regras.json', 'utf8'));
const { routes } = JSON.parse(fs.readFileSync('.portal-planejamento/rotas.json', 'utf8'));
const origin = rules.canonicalOrigin;

test('indexacao seletiva libera exatamente home e sete ferramentas, nunca guias ou 404', () => {
  requireIndexedToolsApproval(rules, routes);
  assert.equal(indexedToolUrls.length, 8);
  for (const route of routes) {
    const expected = indexedToolUrls.includes(route.url);
    const tree = parse(prepareHtml(fs.readFileSync(route.file, 'utf8'), route, { indexedTools: true }));
    const meta = elements(tree, node => node.tagName === 'meta' && attr(node, 'name') === 'robots');
    assert.equal(meta.length, 1);
    assert.equal(attr(meta[0], 'content'), expected ? 'index, follow' : 'noindex, nofollow');
    assert.equal(canIndexRoute(route), false);
    assert.equal(canIndexRoute(route, { indexedTools: true }), expected);
  }
  assert.equal(canIndexRoute({ url: '/qualquer-outra/', group: 'tool', indexable: true }, { indexedTools: true }), false);
  assert.equal(canIndexRoute({ url: '/', group: 'guide', indexable: true }, { indexedTools: true }), false);
});

test('sitemap seletivo possui somente oito canonicas e permite leitura do noindex', () => {
  const xml = sitemap(routes, origin, false, true);
  assert.equal((xml.match(/<loc>/g) || []).length, 8);
  for (const route of routes) assert.equal(xml.includes(`<loc>${origin}${route.url}</loc>`), indexedToolUrls.includes(route.url));
  assert.equal(robots(origin, false, true), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  assert.equal((sitemap(routes, origin, false).match(/<loc>/g) || []).length, 0);
  assert.ok(robots(origin, false).includes('Disallow: /'));
});

test('indexacao seletiva recusa autorizacao ausente, inventario ampliado e modos misturados', () => {
  assert.throws(() => requireIndexedToolsApproval({ ...rules, release: { ...rules.release, indexedToolsApprovedByUser: false } }, routes));
  assert.throws(() => requireIndexedToolsApproval(rules, routes.filter(route => route.url !== '/')));
  assert.throws(() => canIndexRoute(routes[0], { production: true, indexedTools: true }));
});

test('envio indexavel exige opcao manual, autorizacao especifica e exatamente oito URLs', () => {
  const hash = 'a'.repeat(64), commit = 'b'.repeat(40);
  const context = { approved: 'true', indexedTools: true, indexedToolsApproved: true, repository: 'semprepatriota/jesus-te-ama-1', ref: 'refs/heads/main', commit, expectedCommit: commit, expectedHash: hash, packageCheck: { passed: true, mode: 'public-preview-indexed-tools', pages: 27, files: 94, sha256: hash, indexedPages: 8, indexedUrls: [...indexedToolUrls].sort() } };
  assert.equal(verifyPreviewAuthorization(context).finalValidationComplete, false);
  for (const change of [{ indexedToolsApproved: false }, { indexedTools: false }, { approved: 'false' }, { expectedHash: 'c'.repeat(64) }, { packageCheck: { ...context.packageCheck, indexedPages: 26 } }, { packageCheck: { ...context.packageCheck, indexedUrls: [...context.packageCheck.indexedUrls, '/guias/'] } }]) assert.throws(() => verifyPreviewAuthorization({ ...context, ...change }));
  const workflow = yaml(fs.readFileSync('.github/workflows/static.yml', 'utf8'));
  assert.equal(workflow.on.workflow_dispatch.inputs.index_tools.default, false);
  const preview = workflow.jobs['deploy-preview'];
  assert.ok(preview.steps.some(step => step.run === 'node scripts/verify-preview-release.mjs' && step.env.PREVIEW_INDEX_TOOLS === '${{ inputs.index_tools }}'));
  assert.ok(workflow.jobs.deploy.if.includes('inputs.index_tools != true'));
});
