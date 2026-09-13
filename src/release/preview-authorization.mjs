export function verifyPreviewAuthorization({ approved, repository, ref, commit, expectedCommit, expectedHash, packageCheck }) {
  if (approved !== 'true') throw new Error('Previa publica exige dispatch autorizado.');
  if (repository !== 'semprepatriota/jesus-te-ama-1' || ref !== 'refs/heads/main') throw new Error('Destino de previa publica divergente.');
  if (!/^[a-f0-9]{40}$/.test(expectedCommit || '') || commit !== expectedCommit) throw new Error('Commit de previa divergente.');
  if (!/^[a-f0-9]{64}$/.test(expectedHash || '') || packageCheck?.sha256 !== expectedHash) throw new Error('Pacote de previa divergente.');
  if (!packageCheck.passed || packageCheck.mode !== 'public-preview' || packageCheck.pages !== 27 || packageCheck.files !== 94) throw new Error('Previa publica incompleta ou modo incorreto.');
  return { passed: true, mode: 'public-preview', commit, sha256: expectedHash, finalValidationComplete: false };
}
