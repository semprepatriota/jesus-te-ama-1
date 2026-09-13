import { build } from 'esbuild';
await build({ entryPoints: ['src/tools/app.js'], outfile: '_portal/video-tools.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', minify: true, legalComments: 'eof' });
console.log('Interfaces compiladas em _portal/video-tools.js');
