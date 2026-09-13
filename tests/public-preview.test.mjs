import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse as yaml } from 'yaml';
import { packageFiles } from '../src/release/inventory.mjs';
import { verifyPreviewAuthorization } from '../src/release/preview-authorization.mjs';
const rules = JSON.parse(fs.readFileSync('.portal-planejamento/regras.json', 'utf8'));
const { routes } = JSON.parse(fs.readFileSync('.portal-planejamento/rotas.json', 'utf8'));
const hash = 'a'.repeat(64), commit = 'b'.repeat(40);
const context = { approved: 'true', repository: 'semprepatriota/jesus-te-ama-1', ref: 'refs/heads/main', commit, expectedCommit: commit, expectedHash: hash, packageCheck: { passed: true, mode: 'public-preview', pages: 27, files: 94, sha256: hash } };
test('previa publica inclui 404 sem mudar inventario padrao ou adicionar arquivos privados', () => {
  const files = packageFiles(routes, rules.compatibilityAliases, false, true);
  assert.equal(files.length, 94); assert.ok(files.includes('404.html'));
  assert.equal(packageFiles(routes, rules.compatibilityAliases, false).length, 93);
  assert.ok(files.every(file => !/^src\/|^scripts\/|\.portal-planejamento|^media\/|\.pdf$|\.pem$/.test(file)));
});
test('autorizacao publica e vinculada a commit e pacote, nao homologacao final', () => {
  assert.equal(verifyPreviewAuthorization(context).finalValidationComplete, false);
  for (const change of [{ approved: 'false' }, { expectedHash: '' }, { expectedHash: 'c'.repeat(64) }, { expectedCommit: '' }, { commit: 'c'.repeat(40) }, { repository: 'other/project' }, { ref: 'refs/heads/test' }, { packageCheck: { ...context.packageCheck, mode: 'production' } }, { packageCheck: { ...context.packageCheck, pages: 26 } }]) assert.throws(() => verifyPreviewAuthorization({ ...context, ...change }));
});
test('dispatch de previa e manual e separado da producao assinada', () => {
  const workflow = yaml(fs.readFileSync('.github/workflows/static.yml', 'utf8'));
  assert.equal(workflow.on.workflow_dispatch.inputs.public_preview.default, false);
  const preview = workflow.jobs['deploy-preview'];
  assert.equal(preview.needs, 'validate'); assert.ok(preview.if.includes('workflow_dispatch') && preview.if.includes('inputs.release != true') && preview.if.includes('refs/heads/main'));
  const steps = preview.steps, gate = steps.findIndex(step => step.run === 'node scripts/verify-preview-release.mjs'), upload = steps.findIndex(step => step.uses?.startsWith('actions/upload-pages-artifact@'));
  assert.ok(gate >= 0 && gate < upload); assert.equal(steps[upload].with.path, 'dist-public-preview');
  assert.ok(workflow.jobs.deploy.if.includes('inputs.public_preview != true'));
  assert.ok(workflow.jobs.deploy.steps.some(step => step.run === 'node scripts/verify-release-attestation.mjs'));
});
