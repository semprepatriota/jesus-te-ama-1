import { createPublicKey, verify } from 'node:crypto';

const fail = message => { throw new Error(`Publicacao bloqueada: ${message}`); };
const hash = value => /^[a-f0-9]{64}$/.test(value || '');
export function verifyAttestation(envelope, publicKey, { repository, commit, ref, state, gates, now = Date.now(), packageSha256, treeSha256 } = {}) {
  if (ref !== 'refs/heads/main') fail('destino diferente da main.');
  if (!envelope?.payload || typeof envelope.signature !== 'string') fail('recibo assinado ausente.');
  const key = createPublicKey(publicKey);
  if (key.asymmetricKeyType !== 'ed25519') fail('chave de aprovacao invalida.');
  const signature = Buffer.from(envelope.signature, 'base64');
  if (signature.length !== 64 || signature.toString('base64') !== envelope.signature || !verify(null, Buffer.from(JSON.stringify(envelope.payload)), key, signature)) fail('assinatura invalida.');
  const payload = envelope.payload;
  if (payload.schemaVersion !== 1 || payload.repository !== repository || repository !== 'semprepatriota/jesus-te-ama-1' || payload.commit !== commit || !/^[a-f0-9]{40}$/.test(commit || '') || payload.origin !== 'https://www.hfnew.com.br') fail('recibo de outro codigo ou dominio.');
  const issued = Date.parse(payload.issuedAt), expires = Date.parse(payload.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || issued > now + 60000 || issued > expires || expires <= now || expires - issued > 72 * 3600000) fail('recibo expirado ou janela invalida.');
  if (payload.localGate?.result !== 'pass' || payload.localGate.scope !== 'pre-publicacao-local' || !hash(payload.localGate.stdoutSha256) || !hash(payload.localGate.receiptSha256) || !hash(payload.packageSha256) || !hash(payload.treeSha256)) fail('gate local completo nao comprovado.');
  if (!Array.isArray(payload.stages) || payload.stages.length !== 9 || !Array.isArray(state?.stages)) fail('etapas incompletas.');
  for (let id = 1; id <= 9; id++) {
    const stage = state.stages.find(stage => stage.id === id), approved = payload.stages[id - 1];
    if (stage?.status !== 'done' || approved?.id !== id || !hash(approved.evidenceSha256) || approved.evidenceSha256 !== stage.evidence?.sha256) fail(`etapa ${id} nao corresponde a aprovacao local.`);
  }
  if (!Array.isArray(payload.prePublishGates) || JSON.stringify(payload.prePublishGates) !== JSON.stringify(gates)) fail('criterios previos incompletos.');
  if (packageSha256 !== undefined && packageSha256 !== payload.packageSha256) fail('bytes do pacote diferentes dos aprovados.');
  if (treeSha256 !== undefined && treeSha256 !== payload.treeSha256) fail('arvore publica diferente da aprovada.');
  return payload;
}
