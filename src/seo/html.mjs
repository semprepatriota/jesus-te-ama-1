import { parse, parseFragment, serializeOuter } from 'parse5';
import { canIndexRoute } from './indexing.mjs';
export const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
export function elements(node, predicate) { const result = []; function visit(item) { if (predicate(item)) result.push(item); for (const child of item.childNodes ?? []) visit(child); } visit(node); return result; }
export const text = node => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('');
export const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const descriptions = {
  '/': 'Limpe metadados de uma cópia do vídeo no navegador. Inspecione campos suportados, corte, comprima, extraia áudio ou capture uma imagem sem enviar o arquivo.',
  '/comprimir-video/': 'Reduza o tamanho de uma cópia do vídeo, escolha qualidade e resolução e compare o resultado. Processamento local, com limites e suporte de codecs informados.',
  '/video-para-whatsapp/': 'A ferramenta dedicada de compartilhamento foi descontinuada. Consulte o catálogo atual de ferramentas locais para vídeo e áudio.',
  '/converter-para-mp4/': 'O conversor dedicado foi descontinuado. Consulte o catálogo atual de ferramentas locais para editar uma cópia de seu vídeo.',
  '/cortar-video/': 'Selecione início e fim e gere um trecho MP4 do vídeo no navegador. Confira a cópia antes de baixar, sem substituir o original.',
  '/limpar-metadados-video/': 'Limpe metadados de vídeo online: inspecione campos pessoais suportados, escolha o que remover e confira uma cópia. Sem upload; não garante anonimato.',
  '/extrair-audio/': 'Extraia uma trilha de áudio compatível do vídeo para WAV ou M4A no navegador. Confira a reprodução da cópia e os limites de formato.',
  '/capturar-miniatura/': 'Escolha um momento do vídeo e capture um quadro para baixar em PNG ou JPEG. Veja a imagem real antes do download, com processamento no navegador.'
};

export function prepareHtml(html, route, { origin = 'https://www.hfnew.com.br', production = false, indexedTools = false } = {}) {
  const indexable = canIndexRoute(route, { production, indexedTools });
  const tree = parse(html, { sourceCodeLocationInfo: true });
  const head = elements(tree, node => node.tagName === 'head')[0];
  const title = elements(head, node => node.tagName === 'title')[0];
  const descriptionNode = elements(head, node => node.tagName === 'meta' && attr(node, 'name') === 'description')[0];
  if (!head?.sourceCodeLocation || !title || (!descriptionNode && !descriptions[route.url])) throw new Error(`SEO ausente: ${route.file}`);
  const name = text(title).trim(), description = descriptions[route.url] ?? attr(descriptionNode, 'content');
  const canonical = new URL(route.url, origin).href;
  const graph = { '@context': 'https://schema.org', '@type': route.group === 'hub' ? 'CollectionPage' : 'WebPage', '@id': `${canonical}#page`, url: canonical, name, description, inLanguage: 'pt-BR', isPartOf: { '@id': `${origin}/#website` } };
  if (route.group === 'home') graph.isPartOf = { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: 'HF Ferramentas', inLanguage: 'pt-BR' };
  const managedNames = new Set(['description', 'robots', 'portal-seo-stage', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']);
  function managed(node) {
    if (node.tagName === 'link') return attr(node, 'rel') === 'canonical' || attr(node, 'href')?.endsWith('/measurement.css');
    if (node.tagName === 'meta') return managedNames.has(attr(node, 'name')) || attr(node, 'property')?.startsWith('og:');
    if (node.tagName === 'script') return attr(node, 'type') === 'application/ld+json' || attr(node, 'src')?.endsWith('/measurement.js');
    return false;
  }
  head.childNodes = head.childNodes.filter(node => !managed(node));
  const base = '../'.repeat(route.file.split('/').length - 1);
  const fragment = parseFragment(`<meta name="portal-seo-stage" content="9"><meta name="description" content="${escape(description)}"><meta name="robots" content="${indexable ? 'index, follow' : 'noindex, nofollow'}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="HF Ferramentas"><meta property="og:title" content="${escape(name)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${origin}/_portal/amostra.jpg"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${JSON.stringify(graph).replaceAll('<', '\\u003c')}</script><link rel="stylesheet" href="${base}_portal/measurement.css"><script type="module" src="${base}_portal/measurement.js"></script>`);
  for (const node of fragment.childNodes) { node.parentNode = head; head.childNodes.push(node); }
  const location = head.sourceCodeLocation;
  const serialized = serializeOuter(head).replace(/[ \t]+(?=\r?$)/gm, '');
  return html.slice(0, location.startOffset) + serialized + html.slice(location.endOffset);
}

export function sitemap(routes, origin, production, indexedTools = false) {
  const entries = routes.filter(route => canIndexRoute(route, { production, indexedTools })).map(route => `<url><loc>${escape(new URL(route.url, origin).href)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
export function robots(origin, production, indexedTools = false) { return production || indexedTools ? `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n'; }
