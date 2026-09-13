import fs from 'node:fs';
import path from 'node:path';
import { verifyPublic } from './verify-public.mjs';
import { verifyPreviewAuthorization } from '../src/release/preview-authorization.mjs';
const rules = JSON.parse(fs.readFileSync('.portal-planejamento/regras.json', 'utf8'));
if (!rules.release.publicPreviewApprovedByUser) throw new Error('Previa publica nao autorizada no plano.');
const indexedTools = process.env.PREVIEW_INDEX_TOOLS === 'true';
if (process.env.PREVIEW_INDEX_TOOLS && !['true', 'false'].includes(process.env.PREVIEW_INDEX_TOOLS)) throw new Error('Opcao de indexacao invalida.');
const packageCheck = verifyPublic(path.resolve('dist-public-preview'), { publicPreview: true, indexedTools });
console.log(JSON.stringify(verifyPreviewAuthorization({
  approved: process.env.PREVIEW_APPROVED,
  indexedTools,
  indexedToolsApproved: rules.release.indexedToolsApprovedByUser,
  repository: process.env.GITHUB_REPOSITORY,
  ref: process.env.GITHUB_REF,
  commit: process.env.GITHUB_SHA,
  expectedCommit: process.env.PREVIEW_COMMIT,
  expectedHash: process.env.PREVIEW_SHA256,
  packageCheck
}), null, 2));
