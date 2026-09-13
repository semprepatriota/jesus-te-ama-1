import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verifyCiPlan } from '../scripts/verify-ci-plan.mjs';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const rules = read('.portal-planejamento/regras.json'), routes = read('.portal-planejamento/rotas.json').routes, state = read('.portal-planejamento/estado.json');
test('CI valida estrutura sem alegar revisao dos backups privados ou autorizar publicacao', () => {
  const result = verifyCiPlan(rules, routes, state);
  assert.equal(result.passed, true); assert.equal(result.historicalEvidenceChecked, false); assert.equal(result.publicationAuthorized, false);
});
test('CI nao permite mudar privacidade ou pular dependencias por falta de evidencias remotas', () => {
  const changed = structuredClone(rules); changed.constraints.uploadUserMedia = true;
  assert.throws(() => verifyCiPlan(changed, routes, state), /Regra aprovada/);
  const invalid = structuredClone(state); invalid.stages[8].status = 'active';
  assert.throws(() => verifyCiPlan(rules, routes, invalid), /depende/);
});
