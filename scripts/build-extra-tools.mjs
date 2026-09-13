import { build } from 'esbuild';
await build({ entryPoints: ['src/tools/extra-app.js'], outfile: '_portal/extra-tools.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', minify: true, legalComments: 'eof' });
console.log('Interfaces complementares compiladas.');
