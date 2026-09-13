import fs from 'node:fs';
import path from 'node:path';
import { generateKeyPairSync, createPublicKey } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.cwd() !== root || fs.realpathSync('.portal-planejamento/backups') !== path.resolve('.portal-planejamento/backups') || fs.realpathSync('src/release') !== path.resolve('src/release')) throw new Error('Pasta de chaves fora do projeto ou com redirecionamento.');
const folder = path.resolve('.portal-planejamento/backups/release-signing');
const privateFile = path.join(folder, 'private-key.pem');
const publicFile = 'src/release/trusted-public-key.pem';
if (fs.existsSync(privateFile) || fs.existsSync(publicFile)) throw new Error('Chave existente; nao sobrescrever.');
if (fs.existsSync(folder) && fs.lstatSync(folder).isSymbolicLink()) throw new Error('Pasta de chaves nao pode ser link.');
fs.mkdirSync(folder, { recursive: true });
const pair = generateKeyPairSync('ed25519');
fs.writeFileSync(privateFile, pair.privateKey.export({ type: 'pkcs8', format: 'pem' }), { flag: 'wx', mode: 0o600 });
fs.writeFileSync(publicFile, createPublicKey(pair.privateKey).export({ type: 'spki', format: 'pem' }), { flag: 'wx' });
console.log(JSON.stringify({ initialized: true, privateKeyInIgnoredLocalBackup: true, publicationAuthorized: false }));
