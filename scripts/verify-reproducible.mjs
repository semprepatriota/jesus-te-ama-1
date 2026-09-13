import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { verifyPublic } from './verify-public.mjs';
const before = verifyPublic(path.resolve('dist'));
const build = spawnSync(process.execPath, ['scripts/build-public.mjs'], { encoding: 'utf8' });
if (build.status !== 0) throw new Error(build.stdout + build.stderr);
const after = verifyPublic(path.resolve('dist'));
if (before.sha256 !== after.sha256) throw new Error('Build nao reproduzivel para as mesmas entradas.');
console.log(JSON.stringify({ passed: true, consecutiveBuilds: 2, sha256: after.sha256, scope: 'Mesmo ambiente e entradas; CI remoto ainda nao executado' }, null, 2));
