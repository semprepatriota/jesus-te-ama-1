import { createReadStream } from 'node:fs';
import { readFile, realpath, stat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export function requireCheck(condition, message) {
  if (!condition) throw new Error(message);
}

export async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function json(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function safePath(root, relative) {
  requireCheck(typeof relative === 'string' && relative.length > 0, 'Caminho de evidencia ausente.');
  requireCheck(!path.isAbsolute(relative) && !relative.includes('\\') && !relative.split('/').includes('..'), `Caminho relativo invalido: ${relative}`);
  const base = await realpath(root);
  const resolved = await realpath(path.resolve(base, relative));
  const distance = path.relative(base, resolved);
  requireCheck(distance !== '' && !distance.startsWith('..') && !path.isAbsolute(distance), `Caminho fora da pasta esperada: ${relative}`);
  return resolved;
}

export function validatePlan(rules, routes) {
  const groups = { home: 1, tool: 7, hub: 1, guide: 10, trust: 7, error: 1 };
  const pages = [0, 0, 1, 0, 3, 4, 11, 7, 0, 1];
  const tools = ['/comprimir-video/', '/video-para-whatsapp/', '/converter-para-mp4/', '/cortar-video/', '/limpar-metadados-video/', '/extrair-audio/', '/capturar-miniatura/'];
  requireCheck(rules.schemaVersion === 1 && rules.scopeRevision === 2 && rules.expectedPageCount === 27, 'Versao ou contagem esperada do plano invalida.');
  requireCheck(rules.canonicalOrigin === 'https://www.hfnew.com.br', 'Dominio canonico divergente do aprovado.');
  requireCheck(Array.isArray(rules.phases) && rules.phases.length === 10, 'O plano deve conter dez etapas.');
  requireCheck(Array.isArray(routes) && routes.length === 27, 'O mapa deve conter exatamente 27 rotas.');
  const expectedConstraints = { metadataScope: 'video', filesProcessedLocally: true, uploadUserMedia: false, collectFilenamesOrMetadata: false, overwriteOriginalFiles: false, reelsTool: false, socialDownloader: false, rootIsCatalog: true, legacyFunnel: false, legacyTracking: false, automaticPublishing: false };
  for (const [key, value] of Object.entries(expectedConstraints)) requireCheck(rules.constraints?.[key] === value, `Regra aprovada alterada: ${key}`);
  const unique = new Set();
  const files = new Set();
  for (const item of routes) {
    requireCheck(typeof item.url === 'string' && item.url.startsWith('/') && !/[?#\\]/.test(item.url), 'Rota invalida.');
    const decoded = decodeURIComponent(item.url);
    requireCheck(!decoded.split('/').some(part => part === '..' || part === '.'), `Rota insegura: ${item.url}`);
    const key = decoded.toLowerCase();
    requireCheck(!unique.has(key), `Rota duplicada: ${item.url}`);
    unique.add(key);
    const expectedFile = decoded === '/' ? 'index.html' : decoded.slice(1) + (decoded.endsWith('/') ? 'index.html' : '');
    requireCheck(item.file === expectedFile, `Arquivo nao corresponde a rota: ${item.url}`);
    requireCheck(!files.has(item.file.toLowerCase()), `Arquivo de pagina duplicado: ${item.file}`);
    files.add(item.file.toLowerCase());
    requireCheck(Object.hasOwn(groups, item.group), `Grupo desconhecido: ${item.group}`);
    requireCheck(Number.isInteger(item.stage) && item.stage >= 1 && item.stage <= 10, 'Etapa da rota invalida.');
    requireCheck(typeof item.adsCandidate === 'boolean' && typeof item.indexable === 'boolean', 'Politicas da rota incompletas.');
    if (item.group === 'error') requireCheck(!item.adsCandidate && !item.indexable, `404 nao pode receber anuncio ou sitemap editorial: ${item.url}`);
  }
  for (const [group, count] of Object.entries(groups)) {
    requireCheck(rules.groups?.[group] === count, `Contagem configurada divergente: ${group}`);
    requireCheck(routes.filter(item => item.group === group).length === count, `Quantidade incorreta no grupo ${group}.`);
  }
  const actualTools = routes.filter(item => item.group === 'tool').map(item => item.url);
  requireCheck(tools.every(url => actualTools.includes(url)), 'As sete ferramentas devem incluir metadados de VIDEO e nao Reels/imagens.');
  requireCheck(!routes.some(item => /quiz|funil|LP[1-6]/i.test(item.url)), 'O funil foi retirado por autorizacao do usuario.');
  requireCheck(Array.isArray(rules.compatibilityAliases) && rules.compatibilityAliases.length === 10, 'Mapa de reaproveitamento incompleto.');
  const aliasNames = new Set();
  for (const alias of rules.compatibilityAliases) {
    requireCheck(typeof alias.source === 'string' && !alias.source.startsWith('/') && !alias.source.includes('\\') && !alias.source.split('/').includes('..') && alias.source.endsWith('.html'), 'Alias invalido.');
    requireCheck(!files.has(alias.source.toLowerCase()) && !aliasNames.has(alias.source.toLowerCase()), 'Alias duplicado ou em conflito com pagina canonica.');
    requireCheck(routes.some(item => item.url === alias.target), 'Destino de alias nao existe no mapa.');
    aliasNames.add(alias.source.toLowerCase());
  }
  requireCheck(!unique.has('/ferramentas/'), 'A home ja e o catalogo; rota redundante.');
  rules.phases.forEach((phase, index) => {
    requireCheck(phase.id === index + 1, 'Etapas devem estar em ordem de 1 a 10.');
    requireCheck(JSON.stringify(phase.dependsOn) === JSON.stringify(index ? [index] : []), `Dependencia incorreta na etapa ${phase.id}.`);
    requireCheck(phase.pages === pages[index] && routes.filter(item => item.stage === phase.id).length === phase.pages, `Contagem de paginas incorreta na etapa ${phase.id}.`);
    requireCheck(Array.isArray(phase.gates) && phase.gates.length > 0 && new Set(phase.gates).size === phase.gates.length, 'Criterios ausentes ou duplicados.');
    requireCheck(typeof phase.document === 'string' && phase.document.startsWith('etapas/'), 'Documento da etapa ausente.');
  });
  const last = rules.phases[9];
  requireCheck(Array.isArray(last.prePublishGates) && last.prePublishGates.length > 0 && last.prePublishGates.every(id => last.gates.includes(id)) && !last.prePublishGates.includes('verificacao-online'), 'Criterios antes/depois da publicacao incorretos.');
  return { phases: 10, pages: 27, tools: 7, aliases: rules.compatibilityAliases.length, groups };
}

export function validateState(rules, state) {
  requireCheck(state.schemaVersion === 1 && Array.isArray(state.stages) && state.stages.length === 10, 'Estado incompleto.');
  state.stages.forEach((stage, index) => {
    requireCheck(stage.id === index + 1 && ['pending', 'active', 'done'].includes(stage.status), 'Status ou ordem invalida.');
    if (stage.status !== 'pending') {
      for (const id of rules.phases[index].dependsOn) requireCheck(state.stages[id - 1].status === 'done', `Etapa ${stage.id} depende da etapa ${id} concluida.`);
    }
    if (stage.status === 'done') {
      requireCheck(stage.evidence?.file && /^[a-f0-9]{64}$/.test(stage.evidence.sha256 ?? '') && Number.isFinite(Date.parse(stage.completedAt)), `Etapa ${stage.id} concluida sem comprovacao.`);
    } else requireCheck(stage.completedAt === null && stage.evidence === null, `Etapa ${stage.id} pendente/ativa com conclusao contraditoria.`);
  });
}

export async function verifyEvidence(root, phase, receipt, requiredGates = phase.gates) {
  requireCheck(receipt.schemaVersion === 1 && receipt.stage === phase.id && Number.isFinite(Date.parse(receipt.checkedAt)), 'Comprovacao invalida ou de outra etapa.');
  requireCheck(Array.isArray(receipt.checks), 'Comprovacao sem criterios.');
  const ids = receipt.checks.map(check => check.id);
  requireCheck(new Set(ids).size === ids.length && ids.every(id => phase.gates.includes(id)), 'Criterio duplicado ou desconhecido.');
  for (const id of requiredGates) {
    const check = receipt.checks.find(item => item.id === id);
    requireCheck(check?.result === 'pass', `Etapa ${phase.id}: criterio ${id} nao passou.`);
    requireCheck(['automatico', 'manual'].includes(check.method), `Metodo ausente: ${id}`);
    if (check.method === 'manual') requireCheck(typeof check.reviewer === 'string' && check.reviewer.trim().length > 0, `Revisor ausente: ${id}`);
    requireCheck(/^[a-f0-9]{64}$/.test(check.sha256 ?? ''), `Hash ausente: ${id}`);
    const artifact = await safePath(root, check.artifact);
    requireCheck((await stat(artifact)).isFile() && (await stat(artifact)).size > 0, `Evidencia vazia: ${id}`);
    requireCheck(await sha256(artifact) === check.sha256, `Hash da evidencia divergente: ${id}`);
  }
}

export async function verifyBackup(root, receipt, compareSource = false) {
  const manifestFile = await safePath(root, receipt.checks.find(check => check.id === 'backup-integridade').artifact);
  const manifest = await json(manifestFile);
  requireCheck(manifest.schemaVersion === 1 && manifest.files?.length > 0 && manifest.verifiedAt, 'Manifesto de backup incompleto.');
  const critical = ['index.html', 'CNAME', 'funil 1/LP6_vls1.html', 'funil 1/LP5_thankyou_upsell.html', 'funil 1/ebook_7_oracoes.pdf', 'media/musica-quiz.mp3.mp3', 'media/kit_familia_01.mp4'];
  requireCheck(new Set(manifest.files.map(item => item.file)).size === manifest.files.length, 'Manifesto com arquivos duplicados.');
  requireCheck(manifest.files.some(item => item.file === '.git/HEAD'), 'Historico Git ausente do backup.');
  requireCheck(Array.isArray(manifest.restoredFiles) && critical.every(file => manifest.restoredFiles.includes(file)), 'Ensaio dos sete arquivos essenciais incompleto.');
  const backupDir = path.dirname(manifestFile);
  const copyRoot = path.join(backupDir, 'arquivos');
  let compared = 0;
  for (const item of manifest.files) {
    requireCheck(Number.isInteger(item.bytes) && item.bytes >= 0 && /^[a-f0-9]{64}$/.test(item.sha256 ?? ''), 'Entrada de manifesto invalida.');
    const copy = await safePath(copyRoot, item.file);
    requireCheck((await stat(copy)).size === item.bytes && await sha256(copy) === item.sha256, `Backup divergente: ${item.file}`);
    if (compareSource && !item.file.startsWith('.git/')) {
      const source = await safePath(root, item.file);
      requireCheck(await sha256(source) === item.sha256, `Arquivo original mudou: ${item.file}`);
      compared++;
    }
  }
  for (const file of manifest.restoredFiles ?? []) {
    const entry = manifest.files.find(item => item.file === file);
    requireCheck(entry, `Restauracao sem entrada no manifesto: ${file}`);
    const restored = await safePath(path.join(backupDir, 'ensaio-restauracao'), file);
    requireCheck(await sha256(restored) === entry.sha256, `Ensaio de restauracao divergente: ${file}`);
  }
  return { files: manifest.files.length, bytes: manifest.bytes, restored: manifest.restoredFiles.length, originalFilesCompared: compared };
}

export async function verifyStoredEvidence(root, rules, state) {
  for (const stage of state.stages.filter(item => item.status === 'done')) {
    const file = await safePath(root, stage.evidence.file);
    requireCheck(await sha256(file) === stage.evidence.sha256, `Comprovacao alterada: etapa ${stage.id}`);
    const receipt = await json(file);
    await verifyEvidence(root, rules.phases[stage.id - 1], receipt);
    if (stage.id === 1) await verifyBackup(root, receipt);
  }
}

export function requirePreviousStages(state, id) {
  requireCheck(Number.isInteger(id) && id >= 1 && id <= 10, 'Etapa deve ser de 1 a 10.');
  const pending = state.stages.filter(stage => stage.id < id && stage.status !== 'done');
  requireCheck(!pending.length, `Etapas anteriores pendentes: ${pending.map(stage => stage.id).join(', ')}`);
}

export async function verifyReleaseTree(root, rules, routes, relative) {
  const artifactRoot = await safePath(root, relative);
  requireCheck((await stat(artifactRoot)).isDirectory(), 'Pacote publico deve ser uma pasta.');
  requireCheck(!path.relative(root, artifactRoot).startsWith('.'), 'Pasta interna nao pode ser pacote publico.');
  const exclusions = new Set(rules.release.excludeFromArtifact.map(name => name.toLowerCase()));
  const digest = createHash('sha256');
  async function walk(dir, parent = '') {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const name = parent ? `${parent}/${entry.name}` : entry.name;
      requireCheck(!entry.isSymbolicLink(), `Link simbolico no pacote: ${name}`);
      requireCheck(!exclusions.has(entry.name.toLowerCase()) && !entry.name.startsWith('.') && !/\.(pem|key|py|ps1|map)$/i.test(entry.name), `Arquivo interno no pacote: ${name}`);
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), name);
      else if (entry.isFile()) digest.update(JSON.stringify([name, await sha256(path.join(dir, entry.name))]) + '\n');
    }
  }
  await walk(artifactRoot);
  for (const route of routes) {
    const file = await safePath(artifactRoot, route.file);
    requireCheck((await stat(file)).size > 0, `Pagina vazia: ${route.file}`);
  }
  for (const alias of rules.compatibilityAliases) await safePath(artifactRoot, alias.source);
  for (const file of ['CNAME', 'robots.txt', 'sitemap.xml']) await safePath(artifactRoot, file);
  const cname = (await readFile(path.join(artifactRoot, 'CNAME'), 'utf8')).trim();
  requireCheck(cname === new URL(rules.canonicalOrigin).hostname, 'CNAME do pacote incorreto.');
  return { artifactRoot, pages: routes.length, sha256: digest.digest('hex') };
}
