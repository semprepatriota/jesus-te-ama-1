import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { verifyPublic } from './verify-public.mjs';
import path from 'node:path';

const receiptFile = process.argv[2];
if (!receiptFile) throw new Error('Informe a comprovacao final real da etapa 10.');
// Only the original complete local gate can authorize a signature.
const gate = spawnSync(process.execPath, ['.portal-planejamento/scripts/verificar.mjs', 'publicacao', receiptFile, 'dist'], { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 ** 2 });
if (gate.status !== 0) throw new Error(gate.stderr || 'Gate local completo recusou publicacao.');
const checked = JSON.parse(gate.stdout);
if (checked.result !== 'pass' || checked.scope !== 'pre-publicacao-local') throw new Error('Resultado do gate invalido.');
for (const args of [['diff','--quiet','HEAD'], ['diff','--cached','--quiet']]) if (spawnSync('git', args).status !== 0) throw new Error('Codigo rastreado nao esta no commit; nao assinar.');
const head = spawnSync('git', ['rev-parse','HEAD'], { encoding: 'utf8' });
if (head.status !== 0) throw new Error('Commit nao verificado.');
if (spawnSync('git', ['ls-files', '--error-unmatch', 'src/release/trusted-public-key.pem', '404.html'], { stdio: 'ignore' }).status !== 0) throw new Error('Chave publica ou 404 ainda nao faz parte do commit.');
const state = JSON.parse(fs.readFileSync('.portal-planejamento/estado.json', 'utf8'));
const rules = JSON.parse(fs.readFileSync('.portal-planejamento/regras.json', 'utf8'));
const verified = verifyPublic(path.resolve('dist'), { production: true });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const payload = {
  schemaVersion: 1, repository: 'semprepatriota/jesus-te-ama-1', commit: head.stdout.trim(), origin: rules.canonicalOrigin,
  issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
  localGate: { result: 'pass', scope: checked.scope, stdoutSha256: digest(gate.stdout), receiptSha256: digest(fs.readFileSync(receiptFile)) },
  packageSha256: verified.sha256, treeSha256: checked.sha256,
  stages: state.stages.filter(stage => stage.id < 10).map(stage => ({ id: stage.id, evidenceSha256: stage.evidence.sha256 })),
  prePublishGates: rules.phases[9].prePublishGates
};
const key = crypto.createPrivateKey(fs.readFileSync('.portal-planejamento/backups/release-signing/private-key.pem'));
const trusted = fs.readFileSync('src/release/trusted-public-key.pem');
if (!crypto.createPublicKey(key).export({ type: 'spki', format: 'der' }).equals(crypto.createPublicKey(trusted).export({ type: 'spki', format: 'der' }))) throw new Error('Chave privada nao corresponde a chave publica rastreada.');
const signature = crypto.sign(null, Buffer.from(JSON.stringify(payload)), key).toString('base64');
const output = `.portal-planejamento/evidencias/release-attestation-${Date.now()}.json`;
fs.writeFileSync(output, JSON.stringify({ payload, signature }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ issued: true, output, commit: payload.commit, packageSha256: payload.packageSha256, privateBackupsIncluded: false, published: false }));
