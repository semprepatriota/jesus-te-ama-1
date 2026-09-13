import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from 'parse5';
import { elements, attr, text, robots, sitemap } from '../src/seo/html.mjs';
import { packageFiles } from '../src/release/inventory.mjs';
const fail = message => { throw new Error(message); };
export function verifyPublic(root, { production = false } = {}) {
  const rules = JSON.parse(fs.readFileSync('.portal-planejamento/regras.json', 'utf8'));
  const { routes } = JSON.parse(fs.readFileSync('.portal-planejamento/rotas.json', 'utf8'));
  const expected = packageFiles(routes, rules.compatibilityAliases, production), actual = [];
  function walk(dir, parent = '') { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const name = parent + entry.name; if (entry.isSymbolicLink()) fail(`Link simbolico: ${name}`); if (entry.isDirectory()) { if (!expected.some(file => file.startsWith(name + '/'))) fail(`Inventario: pasta inesperada ${name}`); walk(path.join(dir, entry.name), name + '/'); } else if (entry.isFile()) actual.push(name); else fail(`Tipo invalido: ${name}`); } }
  walk(root); actual.sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('Inventario do pacote divergente; arquivo ausente ou interno/inesperado.');
  const titles = new Set(), canonicals = new Set();
  for (const route of routes.filter(route => production || route.group !== 'error')) {
    const html = fs.readFileSync(path.join(root, route.file), 'utf8'), tree = parse(html);
    const one = (tag, key, value) => { const list = elements(tree, node => node.tagName === tag && (!key || attr(node, key) === value)); if (list.length !== 1) fail(`Elemento ${tag}/${value} deve ser unico: ${route.file}`); return list[0]; };
    const title = text(one('title')).trim(), description = attr(one('meta', 'name', 'description'), 'content');
    if (title.length < 10 || title.length > 150 || titles.has(title) || description.length < 40 || description.length > 320) fail(`Titulo/descricao invalido: ${route.file}`);
    titles.add(title);
    const canonical = attr(one('link', 'rel', 'canonical'), 'href');
    if (canonical !== new URL(route.url, rules.canonicalOrigin).href || canonicals.has(canonical)) fail(`Canonical invalido: ${route.file}`);
    canonicals.add(canonical);
    if (attr(one('meta', 'name', 'robots'), 'content') !== (production && route.indexable ? 'index, follow' : 'noindex, nofollow')) fail(`Indexacao divergente: ${route.file}`);
    const graph = JSON.parse(text(one('script', 'type', 'application/ld+json')));
    if (graph.url !== canonical || graph.name !== title || graph.description !== description || graph['@context'] !== 'https://schema.org') fail(`Schema divergente: ${route.file}`);
    one('h1');
    for (const node of elements(tree, node => ['script', 'img', 'video', 'source', 'link', 'a'].includes(node.tagName))) {
      const reference = attr(node, ['script', 'img', 'video', 'source'].includes(node.tagName) ? 'src' : 'href');
      if (!reference || reference.startsWith('#') || reference.startsWith('mailto:')) continue;
      const url = new URL(reference, new URL(route.file, rules.canonicalOrigin + '/'));
      if (url.origin !== rules.canonicalOrigin) { if (node.tagName !== 'a') fail(`Recurso externo: ${reference}`); continue; }
      let file = decodeURIComponent(url.pathname.slice(1)); if (!file || file.endsWith('/')) file += 'index.html';
      if (!actual.includes(file)) fail(`Link/recurso ausente ${route.file}: ${file}`);
    }
  }
  if (fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8') !== sitemap(routes, rules.canonicalOrigin, production) || fs.readFileSync(path.join(root, 'robots.txt'), 'utf8') !== robots(rules.canonicalOrigin, production)) fail('Sitemap/robots divergentes do modo.');
  if (fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim() !== new URL(rules.canonicalOrigin).hostname) fail('CNAME divergente.');
  for (const file of actual.filter(file => /\.(js|html|txt)$/i.test(file))) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    if (/GTM-TPRFFVTM|googletagmanager\.com|google-analytics\.com|googlesyndication\.com|ca-pub-\d|pub-\d|-----BEGIN .*PRIVATE KEY|hfnew1234@gmail|https?:\/\/[^\s"']*n8n/i.test(source)) fail(`Integracao/segredo nao aprovado: ${file}`);
  }
  const hash = crypto.createHash('sha256');
  for (const file of actual) hash.update(JSON.stringify([file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]) + '\n');
  return { passed: true, mode: production ? 'production' : 'preview', files: actual.length, pages: canonicals.size, sha256: hash.digest('hex'), publishable: false, note: 'Integridade tecnica nao substitui comprovacao e gate da etapa 10.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/verify-public.mjs')) console.log(JSON.stringify(verifyPublic(path.resolve('dist'), { production: process.argv.includes('--production') }), null, 2));
