import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guides } from '../src/guides/content.mjs';
import { parse } from 'parse5';
import { elements, attr } from '../src/seo/html.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { routes } = JSON.parse(fs.readFileSync(path.join(root, '.portal-planejamento/rotas.json'), 'utf8'));
for (const slug of new Set(guides.map(guide => guide.tool))) {
  if (!routes.some(route => route.group === 'tool' && route.url === `/${slug}/`)) throw new Error(`Ferramenta inativa: ${slug}`);
  const file = path.join(root, slug, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('guides-links.css')) html = html.replace('</head>', '  <link rel="stylesheet" href="../_portal/guides-links.css">\n</head>');
  const section = `<section class="guide-connections" aria-labelledby="guide-links-title"><h2 id="guide-links-title">Guias relacionados</h2><ul>${guides.filter(guide => guide.tool === slug).map(guide => `<li><a href="../guias/${guide.slug}/index.html">${guide.title}<img src="../_portal/icons/arrow-right.svg" width="18" height="18" alt=""></a></li>`).join('')}</ul><a class="all-guides" href="../guias/index.html">Todos os guias</a></section>`;
  const tree = parse(html, { sourceCodeLocationInfo: true });
  const existing = elements(tree, node => node.tagName === 'section' && attr(node, 'class')?.split(/\s+/).includes('guide-connections'));
  if (existing.length > 1) throw new Error(`Secao duplicada: ${slug}`);
  if (existing.length) {
    const { startOffset, endOffset } = existing[0].sourceCodeLocation;
    html = html.slice(0, startOffset) + section + html.slice(endOffset);
  } else {
    const main = elements(tree, node => node.tagName === 'main')[0];
    const offset = main?.sourceCodeLocation?.endTag?.startOffset;
    if (offset === undefined) throw new Error(`Conteudo principal ausente: ${slug}`);
    html = html.slice(0, offset) + section + '\n' + html.slice(offset);
  }
  fs.writeFileSync(file, html);
}
console.log(`Guias conectados nas ${new Set(guides.map(guide => guide.tool)).size} ferramentas atuais.`);
