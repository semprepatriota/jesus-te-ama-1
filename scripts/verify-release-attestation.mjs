import fs from 'node:fs';
import path from 'node:path';
import { verifyAttestation } from '../src/release/attestation.mjs';
import { verifyPublic } from './verify-public.mjs';
import { verifyReleaseTree } from '../.portal-planejamento/scripts/controle-lib.mjs';

const raw = process.env.RELEASE_EVIDENCE;
if (typeof raw !== 'string' || raw.length === 0 || raw.length > 32768) throw new Error('Recibo assinado ausente ou excessivo; nenhum upload permitido.');
const rules = JSON.parse(fs.readFileSync('.portal-planejamento/regras.json', 'utf8'));
const state = JSON.parse(fs.readFileSync('.portal-planejamento/estado.json', 'utf8'));
const envelope = JSON.parse(raw);
const publicKey = fs.readFileSync('src/release/trusted-public-key.pem');
const context = { repository: process.env.GITHUB_REPOSITORY, commit: process.env.GITHUB_SHA, ref: process.env.GITHUB_REF, state, gates: rules.phases[9].prePublishGates };
verifyAttestation(envelope, publicKey, context);
const authorizationOnly = process.argv.includes('--authorization-only');
if (!authorizationOnly) {
  const { routes } = JSON.parse(fs.readFileSync('.portal-planejamento/rotas.json', 'utf8'));
  const verified = verifyPublic(path.resolve('dist'), { production: true });
  const tree = await verifyReleaseTree(process.cwd(), rules, routes, 'dist');
  verifyAttestation(envelope, publicKey, { ...context, packageSha256: verified.sha256, treeSha256: tree.sha256 });
}
console.log(JSON.stringify({ passed: true, scope: authorizationOnly ? 'signed-local-authorization' : 'signed-local-authorization-and-exact-public-package', historicalBackupsUploaded: false, historicalBackupsRecheckedInCi: false, published: false }));
