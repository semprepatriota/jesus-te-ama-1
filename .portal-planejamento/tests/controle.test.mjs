import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256, validatePlan, validateState, verifyEvidence, safePath, requirePreviousStages, verifyReleaseTree, verifyBackup } from '../scripts/controle-lib.mjs';

const planning = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rules = JSON.parse(await readFile(path.join(planning, 'regras.json'), 'utf8'));
const { routes } = JSON.parse(await readFile(path.join(planning, 'rotas.json'), 'utf8'));
const pendingState = () => ({ schemaVersion: 1, stages: rules.phases.map(phase => ({ id: phase.id, status: 'pending', evidence: null, completedAt: null })) });

async function withFixture(action) {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'hf-portal-gates-'));
  try { await action(folder); }
  finally {
    const resolved = path.resolve(folder);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('hf-portal-gates-'));
    await rm(resolved, { recursive: true });
  }
}

test('mapa revisado tem 27 rotas em dez etapas', () => {
  assert.equal(validatePlan(rules, routes).pages, 27);
});

test('rejeita a perda de uma pagina', () => {
  assert.throws(() => validatePlan(rules, routes.slice(1)), /27 rotas/);
});

test('rejeita duplicacao de rota', () => {
  const changed = structuredClone(routes);
  changed[2] = structuredClone(changed[1]);
  assert.throws(() => validatePlan(rules, changed), /duplicada/);
});

test('rejeita troca de metadados de video por imagem', () => {
  const changed = structuredClone(routes);
  const cleaner = changed.find(item => item.url === '/limpar-metadados-video/');
  cleaner.url = '/limpar-metadados-imagem/';
  cleaner.file = 'limpar-metadados-imagem/index.html';
  assert.throws(() => validatePlan(rules, changed), /VIDEO/);
});

test('rejeita upload e publicidade em 404', () => {
  const changedRules = structuredClone(rules);
  changedRules.constraints.uploadUserMedia = true;
  assert.throws(() => validatePlan(changedRules, routes), /Regra aprovada/);
  const changedRoutes = structuredClone(routes);
  changedRoutes.find(item => item.group === 'error').adsCandidate = true;
  assert.throws(() => validatePlan(rules, changedRoutes), /404/);
});

test('rejeita dependencia circular', () => {
  const changed = structuredClone(rules);
  changed.phases[0].dependsOn = [10];
  assert.throws(() => validatePlan(changed, routes), /Dependencia/);
});

test('nao permite pular etapas', () => {
  const state = pendingState();
  state.stages[1].status = 'active';
  assert.throws(() => validateState(rules, state), /depende/);
  assert.throws(() => requirePreviousStages(pendingState(), 10), /pendentes/);
});

test('status done sem evidencia e rejeitado', () => {
  const state = pendingState();
  state.stages[0].status = 'done';
  assert.throws(() => validateState(rules, state), /sem comprovacao/);
});

test('comprovacao incompleta ou de outra etapa e rejeitada', async () => {
  const phase = { id: 2, gates: ['rota', 'midia'] };
  const receipt = { schemaVersion: 1, stage: 2, checkedAt: new Date().toISOString(), checks: [] };
  await assert.rejects(verifyEvidence(planning, phase, receipt), /nao passou/);
  await assert.rejects(verifyEvidence(planning, phase, { ...receipt, stage: 3 }), /outra etapa/);
});

test('evidencia real passa e a mesma evidencia adulterada falha', async () => {
  await withFixture(async folder => {
    const file = path.join(folder, 'relatorio.txt');
    await writeFile(file, 'Teste executado: sucesso.');
    const phase = { id: 2, gates: ['rota'] };
    const receipt = { schemaVersion: 1, stage: 2, checkedAt: new Date().toISOString(), checks: [{ id: 'rota', result: 'pass', method: 'automatico', artifact: 'relatorio.txt', sha256: await sha256(file) }] };
    await verifyEvidence(folder, phase, receipt);
    await writeFile(file, 'Teste modificado depois da verificacao.');
    await assert.rejects(verifyEvidence(folder, phase, receipt), /divergente/);
  });
});

test('revisao manual exige revisor e hash', async () => {
  const phase = { id: 3, gates: ['visual'] };
  const receipt = { schemaVersion: 1, stage: 3, checkedAt: new Date().toISOString(), checks: [{ id: 'visual', result: 'pass', method: 'manual' }] };
  await assert.rejects(verifyEvidence(planning, phase, receipt), /Revisor/);
});

test('bloqueia referencia a arquivo fora da pasta', async () => {
  await assert.rejects(safePath(planning, '../AGENTS.md'), /relativo invalido/);
});

test('pacote publico incompleto e rejeitado', async () => {
  await withFixture(async folder => {
    await mkdir(path.join(folder, 'dist'));
    await assert.rejects(verifyReleaseTree(folder, rules, routes, 'dist'), /ENOENT/);
  });
});

test('pacote contendo instrucoes internas e rejeitado', async () => {
  await withFixture(async folder => {
    await mkdir(path.join(folder, 'dist'));
    await writeFile(path.join(folder, 'dist', 'AGENTS.md'), 'Instrucao interna.');
    await assert.rejects(verifyReleaseTree(folder, rules, routes, 'dist'), /Arquivo interno/);
  });
});

test('backup sem ensaio dos arquivos essenciais nao e aceito', async () => {
  await withFixture(async folder => {
    await writeFile(path.join(folder, 'manifesto.json'), JSON.stringify({ schemaVersion: 1, verifiedAt: new Date().toISOString(), files: [{ file: '.git/HEAD' }], restoredFiles: [] }));
    await assert.rejects(verifyBackup(folder, { checks: [{ id: 'backup-integridade', artifact: 'manifesto.json' }] }), /sete arquivos essenciais/);
  });
});

test('pacote valido recebe hash que muda quando o conteudo muda', async () => {
  await withFixture(async folder => {
    const output = path.join(folder, 'dist');
    await mkdir(output);
    const entries = { 'index.html': '<!doctype html><title>Teste</title>', 'CNAME': 'www.hfnew.com.br', 'robots.txt': 'User-agent: *', 'sitemap.xml': '<urlset/>', 'privacidade.html': '<title>Privacidade</title>' };
    for (const [name, content] of Object.entries(entries)) await writeFile(path.join(output, name), content);
    for (const alias of rules.compatibilityAliases) {
      const file = path.join(output, alias.source);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, '<title>Acesso reaproveitado</title>');
    }
    const first = await verifyReleaseTree(folder, rules, [routes[0]], 'dist');
    assert.match(first.sha256, /^[a-f0-9]{64}$/);
    await writeFile(path.join(output, 'index.html'), '<!doctype html><title>Outra versao</title>');
    const second = await verifyReleaseTree(folder, rules, [routes[0]], 'dist');
    assert.notEqual(first.sha256, second.sha256);
  });
});

test('nao permite recuperar o funil por configuracao antiga', () => {
  const changed = structuredClone(rules);
  changed.constraints.legacyFunnel = true;
  assert.throws(() => validatePlan(changed, routes), /Regra aprovada/);
});

test('alias precisa apontar para uma ferramenta ou pagina existente', () => {
  const changed = structuredClone(rules);
  changed.compatibilityAliases[0].target = '/quiz/';
  assert.throws(() => validatePlan(changed, routes), /Destino de alias/);
});
