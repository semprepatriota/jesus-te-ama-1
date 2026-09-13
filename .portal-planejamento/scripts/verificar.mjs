import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { json, requireCheck, sha256, safePath, validatePlan, validateState, verifyEvidence, verifyBackup, verifyStoredEvidence, requirePreviousStages, verifyReleaseTree } from './controle-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const planning = path.join(root, '.portal-planejamento');
const command = process.argv[2] ?? 'plano';

try {
  const rules = await json(path.join(planning, 'regras.json'));
  const { routes } = await json(path.join(planning, 'rotas.json'));
  const stateFile = path.join(planning, 'estado.json');
  const state = await json(stateFile);
  const summary = validatePlan(rules, routes);
  validateState(rules, state);
  for (const phase of rules.phases) {
    const doc = await readFile(await safePath(planning, phase.document), 'utf8');
    for (const gate of phase.gates) requireCheck(doc.includes(`**${gate}**`), `Criterio ${gate} ausente do documento da etapa ${phase.id}.`);
  }

  if (command === 'modelo') {
    const phase = rules.phases.find(item => item.id === Number(process.argv[3]));
    requireCheck(phase, 'Informe uma etapa de 1 a 10.');
    console.log(JSON.stringify({ schemaVersion: 1, stage: phase.id, checkedAt: null, releaseTreeSha256: phase.id === 10 ? null : undefined, checks: phase.gates.map(id => ({ id, result: 'pending', method: null, reviewer: null, artifact: null, sha256: null })) }, null, 2));
  } else if (command === 'estado') {
    console.table(state.stages.map(stage => ({ etapa: stage.id, titulo: rules.phases[stage.id - 1].title, status: stage.status, paginas: rules.phases[stage.id - 1].pages })));
    console.log('Configuracao local. Progresso nao significa que o site esteja publicado.');
  } else if (command === 'plano') {
    await verifyStoredEvidence(root, rules, state);
    console.log(JSON.stringify({ result: 'pass', scope: 'plano-e-evidencias-locais', ...summary, completedStages: state.stages.filter(item => item.status === 'done').map(item => item.id), publicationGuard: rules.constraints.publicationGuard, note: 'Nao certifica funcionamento de paginas ainda nao construidas.' }, null, 2));
  } else if (command === 'baseline') {
    const evidence = state.stages[0].evidence;
    requireCheck(evidence, 'Etapa 1 ainda nao tem comprovacao de backup.');
    const evidenceFile = await safePath(root, evidence.file);
    requireCheck(await sha256(evidenceFile) === evidence.sha256, 'Comprovacao inicial alterada.');
    console.log(JSON.stringify({ result: 'pass', ...await verifyBackup(root, await json(evidenceFile), true) }, null, 2));
  } else if (command === 'concluir') {
    const id = Number(process.argv[3]);
    requirePreviousStages(state, id);
    requireCheck(state.stages[id - 1].status !== 'done', 'Etapa ja concluida; nao sobrescrever comprovacao.');
    await verifyStoredEvidence(root, rules, state);
    const evidenceFile = await safePath(root, process.argv[4]);
    const receipt = await json(evidenceFile);
    await verifyEvidence(root, rules.phases[id - 1], receipt);
    if (id === 1) await verifyBackup(root, receipt, true);
    state.stages[id - 1] = { id, status: 'done', completedAt: new Date().toISOString(), evidence: { file: path.relative(root, evidenceFile).replaceAll('\\', '/'), sha256: await sha256(evidenceFile) } };
    state.updatedAt = new Date().toISOString();
    validateState(rules, state);
    const temp = `${stateFile}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(state, null, 2) + '\n', { flag: 'wx' });
    await rename(temp, stateFile);
    console.log(`Etapa ${id} concluida com comprovacao verificada.`);
  } else if (command === 'pacote') {
    console.log(JSON.stringify(await verifyReleaseTree(root, rules, routes, process.argv[3] ?? 'dist'), null, 2));
  } else if (command === 'publicacao') {
    requirePreviousStages(state, 10);
    await verifyStoredEvidence(root, rules, state);
    requireCheck(rules.release.ciGateInstalled && !rules.release.legacyWorkflowPublishesRoot, 'Integracao do gate ao workflow ainda pendente.');
    const receipt = await json(await safePath(root, process.argv[3]));
    const phase = rules.phases[9];
    await verifyEvidence(root, phase, receipt, phase.prePublishGates);
    const output = await verifyReleaseTree(root, rules, routes, process.argv[4] ?? 'dist');
    requireCheck(receipt.releaseTreeSha256 === output.sha256, 'Pacote difere da versao validada na comprovacao final.');
    console.log(JSON.stringify({ result: 'pass', scope: 'pre-publicacao-local', ...output, note: 'Nenhum upload realizado. A verificacao online e exigida para concluir a etapa 10.' }, null, 2));
  } else throw new Error('Comandos: plano, estado, baseline, modelo N, concluir N COMPROVACAO, pacote PASTA, publicacao COMPROVACAO PASTA.');
} catch (error) {
  console.error(`BLOQUEADO: ${error.message}`);
  process.exitCode = 1;
}
