import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateKeyPairSync, sign } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { verifyAttestation } from '../src/release/attestation.mjs';

// Synthetic keys/proofs are confined to these unit tests, never real release evidence.
const pair = generateKeyPairSync('ed25519');
const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' });
const digest = 'a'.repeat(64), now = Date.parse('2026-09-13T18:00:00Z');
const gates = ['rotas-e-links', 'fluxos-completos', 'desktop-mobile-final', 'pacote-publicavel', 'recuperacao-pronta'];
const state = { stages: Array.from({ length: 9 }, (_, index) => ({ id: index + 1, status: 'done', evidence: { sha256: digest } })) };
const context = { repository: 'semprepatriota/jesus-te-ama-1', commit: 'b'.repeat(40), ref: 'refs/heads/main', state, gates, now };
const payload = {
  schemaVersion: 1, repository: context.repository, commit: context.commit, origin: 'https://www.hfnew.com.br',
  issuedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 3600000).toISOString(),
  localGate: { result: 'pass', scope: 'pre-publicacao-local', stdoutSha256: digest, receiptSha256: digest },
  packageSha256: digest, treeSha256: digest,
  stages: state.stages.map(stage => ({ id: stage.id, evidenceSha256: digest })), prePublishGates: gates
};
function envelope(change = () => {}, privateKey = pair.privateKey) {
  const copy = structuredClone(payload); change(copy);
  return { payload: copy, signature: sign(null, Buffer.from(JSON.stringify(copy)), privateKey).toString('base64') };
}

test('recibo sintetico autentico verifica codigo, etapas e bytes sem publicar', () => {
  assert.deepEqual(verifyAttestation(envelope(), publicKey, { ...context, packageSha256: digest, treeSha256: digest }), payload);
});
test('recibo ausente e assinatura malformada sao bloqueados', () => {
  assert.throws(() => verifyAttestation(null, publicKey, context));
  assert.throws(() => verifyAttestation({ payload, signature: 'invalid' }, publicKey, context));
});
test('outra autoridade nao assina uma aprovacao aceita', () => {
  const other = generateKeyPairSync('ed25519');
  assert.throws(() => verifyAttestation(envelope(() => {}, other.privateKey), publicKey, context), /assinatura invalida/);
});
test('adulteracao de payload apos assinar e rejeitada', () => {
  const proof = envelope(); proof.payload.packageSha256 = 'c'.repeat(64);
  assert.throws(() => verifyAttestation(proof, publicKey, context), /assinatura invalida/);
});
test('aprovacao expirada nao autoriza reenvio', () => {
  assert.throws(() => verifyAttestation(envelope(copy => { copy.expiresAt = new Date(now).toISOString(); }), publicKey, context), /expirado/);
});
test('datas futuras e janelas excessivas sao recusadas', () => {
  assert.throws(() => verifyAttestation(envelope(copy => { copy.issuedAt = new Date(now + 120000).toISOString(); }), publicKey, context));
  assert.throws(() => verifyAttestation(envelope(copy => { copy.expiresAt = new Date(now + 73 * 3600000).toISOString(); }), publicKey, context));
});
test('outro repositorio, dominio ou branch nao reutiliza aprovacao', () => {
  assert.throws(() => verifyAttestation(envelope(copy => { copy.repository = 'other/project'; }), publicKey, context));
  assert.throws(() => verifyAttestation(envelope(copy => { copy.origin = 'https://jesus.hfnew.com.br'; }), publicKey, context));
  assert.throws(() => verifyAttestation(envelope(), publicKey, { ...context, ref: 'refs/heads/preview' }));
});
test('outro commit nao reutiliza o mesmo recibo', () => {
  assert.throws(() => verifyAttestation(envelope(), publicKey, { ...context, commit: 'c'.repeat(40) }));
});
test('etapa pendente, faltante ou comprovacao trocada bloqueia', () => {
  const pending = structuredClone(state); pending.stages[6].status = 'pending';
  assert.throws(() => verifyAttestation(envelope(), publicKey, { ...context, state: pending }));
  assert.throws(() => verifyAttestation(envelope(copy => { copy.stages.pop(); }), publicKey, context));
  assert.throws(() => verifyAttestation(envelope(copy => { copy.stages[7].evidenceSha256 = 'c'.repeat(64); }), publicKey, context));
});
test('gate incompleto, recibo ou pacote adulterados nao liberam envio', () => {
  assert.throws(() => verifyAttestation(envelope(copy => { copy.prePublishGates.pop(); }), publicKey, context));
  assert.throws(() => verifyAttestation(envelope(copy => { copy.localGate.result = 'pending'; }), publicKey, context));
  assert.throws(() => verifyAttestation(envelope(), publicKey, { ...context, packageSha256: 'c'.repeat(64) }));
  assert.throws(() => verifyAttestation(envelope(), publicKey, { ...context, treeSha256: 'c'.repeat(64) }));
});
test('emissor exige o verificador local original e CI recusa recibo ausente', () => {
  const issuer = fs.readFileSync('scripts/issue-release-attestation.mjs', 'utf8');
  assert.ok(issuer.includes("'publicacao', receiptFile, 'dist'"));
  assert.ok(issuer.indexOf('const gate = spawnSync') < issuer.indexOf('crypto.createPrivateKey'));
  const result = spawnSync(process.execPath, ['scripts/verify-release-attestation.mjs', '--authorization-only'], { encoding: 'utf8', env: { ...process.env, RELEASE_EVIDENCE: '' } });
  assert.notEqual(result.status, 0); assert.ok(result.stderr.includes('Recibo assinado ausente'));
});
