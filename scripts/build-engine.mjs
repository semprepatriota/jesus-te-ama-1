import { build } from 'esbuild';
import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

await mkdir('_portal/engine', { recursive: true });
await build({ entryPoints: ['src/media/worker.js'], outfile: '_portal/engine/video-worker.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', minify: true, legalComments: 'eof' });
await build({ entryPoints: ['src/media/client.js'], outfile: '_portal/engine/engine.js', bundle: true, format: 'iife', globalName: 'HFMedia', platform: 'browser', target: 'es2022', minify: true, legalComments: 'eof' });
await copyFile('node_modules/mediabunny/LICENSE', '_portal/engine/mediabunny-LICENSE.txt');
const packageInfo = JSON.parse(await readFile('node_modules/mediabunny/package.json', 'utf8'));
await writeFile('_portal/engine/THIRD-PARTY.txt', `Mediabunny ${packageInfo.version}\nLicense: MPL-2.0\nUnmodified library source: https://registry.npmjs.org/mediabunny/-/mediabunny-${packageInfo.version}.tgz\nRepository: https://github.com/Vanilagy/mediabunny\nLicense text: mediabunny-LICENSE.txt\nBuild tool: esbuild 0.28.2 (MIT), development only.\n`);
console.log('Motor local compilado em ' + path.resolve('_portal/engine'));
