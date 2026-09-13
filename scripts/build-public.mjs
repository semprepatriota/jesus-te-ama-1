import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { prepareHtml, robots, sitemap } from '../src/seo/html.mjs';
import { packageFiles, publicAssets, publicBytes } from '../src/release/inventory.mjs';
import { measurementConfig, advertisingConfig } from '../src/measurement/config.js';
import { requirePreviousStages } from '../.portal-planejamento/scripts/controle-lib.mjs';
import { canIndexRoute, requireIndexedToolsApproval } from '../src/seo/indexing.mjs';
const rules = JSON.parse(fs.readFileSync('.portal-planejamento/regras.json', 'utf8'));
const { routes } = JSON.parse(fs.readFileSync('.portal-planejamento/rotas.json', 'utf8'));
const production = process.argv.includes('--production');
const publicPreview = process.argv.includes('--public-preview');
const indexedTools = process.argv.includes('--indexed-tools');
if (indexedTools && (!publicPreview || production)) throw new Error('Indexacao seletiva exige previa publica separada da producao.');
if (indexedTools) requireIndexedToolsApproval(rules, routes);
if (production && publicPreview) throw new Error('Modos de publicacao mutuamente exclusivos.');
if (publicPreview && !rules.release.publicPreviewApprovedByUser) throw new Error('Previa publica nao autorizada.');
if (measurementConfig.enabled || advertisingConfig.enabled || advertisingConfig.approved || measurementConfig.measurementId || advertisingConfig.publisherId) throw new Error('Ativacao de contas exige implementacao e revisao especificas; este build e sem tags/anuncios.');
if (production) requirePreviousStages(JSON.parse(fs.readFileSync('.portal-planejamento/estado.json', 'utf8')), 10);
const directory = publicPreview ? 'dist-public-preview' : 'dist';
const output = path.resolve(directory);
if (path.dirname(output) !== process.cwd()) throw new Error('dist fora da pasta do projeto.');
if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw new Error('dist nao pode ser link simbolico.');
fs.mkdirSync(output, { recursive: true });
const allowed = packageFiles(routes, rules.compatibilityAliases, production, publicPreview);
function checkExisting(dir, parent = '') { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const name = parent + entry.name; if (entry.isSymbolicLink()) throw new Error(`Link no pacote: ${name}`); if (entry.isDirectory()) checkExisting(path.join(dir, entry.name), name + '/'); else if (!allowed.includes(name)) throw new Error(`Arquivo inesperado em dist; revisar sem apagar: ${name}`); } }
checkExisting(output);
function write(file, data) { const target = path.join(output, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, publicBytes(file, data)); }
for (const route of routes.filter(route => production || publicPreview || route.group !== 'error')) write(route.file, prepareHtml(fs.readFileSync(route.file, 'utf8'), route, { origin: rules.canonicalOrigin, production, indexedTools }));
for (const alias of rules.compatibilityAliases) write(alias.source, fs.readFileSync(alias.source));
const compiled = new Set(['_portal/video-tools.js', '_portal/extra-tools.js', '_portal/measurement.js', '_portal/engine/engine.js', '_portal/engine/video-worker.js']);
for (const file of publicAssets.filter(file => !compiled.has(file))) { if (fs.lstatSync(file).isSymbolicLink()) throw new Error(`Asset nao pode ser link: ${file}`); write(file, fs.readFileSync(file)); }
for (const [entry, file, format, globalName] of [['src/tools/app.js', '_portal/video-tools.js', 'iife'], ['src/tools/extra-app.js', '_portal/extra-tools.js', 'iife'], ['src/measurement/runtime.js', '_portal/measurement.js', 'esm'], ['src/media/worker.js', '_portal/engine/video-worker.js', 'iife'], ['src/media/client.js', '_portal/engine/engine.js', 'iife', 'HFMedia']]) await build({ entryPoints: [entry], outfile: path.join(output, file), bundle: true, format, ...(globalName ? { globalName } : {}), platform: 'browser', target: 'es2022', minify: true, legalComments: 'eof' });
write('CNAME', new URL(rules.canonicalOrigin).hostname + '\n');
write('robots.txt', robots(rules.canonicalOrigin, production, indexedTools));
write('sitemap.xml', sitemap(routes, rules.canonicalOrigin, production, indexedTools));
console.log(JSON.stringify({ mode: production ? 'production-awaiting-release-gate' : indexedTools ? 'public-preview-indexed-tools' : publicPreview ? 'public-preview' : 'preview-not-publishable', directory, files: allowed.length, pages: production || publicPreview ? 27 : 26, indexedPages: routes.filter(route => canIndexRoute(route, { production, indexedTools })).length, published: false }));
