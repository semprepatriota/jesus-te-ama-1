import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePlan, validateState } from '../.portal-planejamento/scripts/controle-lib.mjs';
export function verifyCiPlan(rules, routes, state) {
  const summary = validatePlan(rules, routes); validateState(rules, state);
  return { passed: true, scope: 'estrutura-do-plano-no-ci', ...summary, historicalEvidenceChecked: false, publicationAuthorized: false, note: 'Backups e evidencias privadas nao sao enviados ao GitHub; o gate local completo continua obrigatorio.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(JSON.stringify(verifyCiPlan(read('.portal-planejamento/regras.json'), read('.portal-planejamento/rotas.json').routes, read('.portal-planejamento/estado.json')), null, 2));
}
