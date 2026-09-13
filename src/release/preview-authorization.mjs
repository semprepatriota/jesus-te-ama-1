import { indexedToolUrls } from '../seo/indexing.mjs';

export function verifyPreviewAuthorization({ approved, indexedTools = false, indexedToolsApproved = false, repository, ref, commit, expectedCommit, expectedHash, packageCheck }) {
  if (indexedTools && indexedToolsApproved !== true) throw new Error('Indexacao seletiva exige autorizacao especifica.');
  if (approved !== 'true') throw new Error('Previa publica exige dispatch autorizado.');
  if (repository !== 'semprepatriota/jesus-te-ama-1' || ref !== 'refs/heads/main') throw new Error('Destino de previa publica divergente.');
  if (!/^[a-f0-9]{40}$/.test(expectedCommit || '') || commit !== expectedCommit) throw new Error('Commit de previa divergente.');
  if (!/^[a-f0-9]{64}$/.test(expectedHash || '') || packageCheck?.sha256 !== expectedHash) throw new Error('Pacote de previa divergente.');
  const mode = indexedTools ? 'public-preview-indexed-tools' : 'public-preview';
  if (!packageCheck.passed || packageCheck.mode !== mode || packageCheck.pages !== 27 || packageCheck.files !== 94) throw new Error('Previa publica incompleta ou modo incorreto.');
  if (indexedTools && (packageCheck.indexedPages !== 8 || JSON.stringify(packageCheck.indexedUrls) !== JSON.stringify([...indexedToolUrls].sort()))) throw new Error('Indexacao excede escopo aprovado.');
  if (!indexedTools && ((packageCheck.indexedPages ?? 0) !== 0 || (packageCheck.indexedUrls ?? []).length)) throw new Error('Previa sem indexacao contem paginas indexaveis.');
  return { passed: true, mode, commit, sha256: expectedHash, indexedPages: indexedTools ? 8 : 0, finalValidationComplete: false };
}
