export const indexedToolUrls = Object.freeze([
  '/',
  '/comprimir-video/',
  '/video-para-whatsapp/',
  '/converter-para-mp4/',
  '/cortar-video/',
  '/limpar-metadados-video/',
  '/extrair-audio/',
  '/capturar-miniatura/'
]);

export function canIndexRoute(route, { production = false, indexedTools = false } = {}) {
  if (production && indexedTools) throw new Error('Indexacao seletiva e producao sao modos distintos.');
  return route.indexable === true && (production || (indexedTools && indexedToolUrls.includes(route.url) && ['home', 'tool'].includes(route.group)));
}

export function requireIndexedToolsApproval(rules, routes) {
  if (rules.release.indexedToolsApprovedByUser !== true) throw new Error('Indexacao seletiva nao autorizada.');
  const allowed = routes.filter(route => canIndexRoute(route, { indexedTools: true })).map(route => route.url).sort();
  if (JSON.stringify(allowed) !== JSON.stringify([...indexedToolUrls].sort())) throw new Error('Inventario da indexacao seletiva divergente.');
}
