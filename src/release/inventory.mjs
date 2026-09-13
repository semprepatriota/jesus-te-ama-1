export const publicAssets = Object.freeze([
  'base.css', 'home.css', 'home.js', 'video-tools.css', 'video-tools.js', 'extra-tools.css', 'extra-tools.js', 'guides.css', 'guides.js', 'guides-links.css', 'trust.css', 'footer.css', 'measurement.css', 'measurement.js',
  'amostra.mp4', 'amostra.jpg', 'amostra-ferramentas.mp4', 'manrope.ttf', 'manrope-OFL.txt', 'lucide-LICENSE.txt', 'clapperboard.svg',
  'engine/engine.js', 'engine/video-worker.js', 'engine/mediabunny-LICENSE.txt', 'engine/THIRD-PARTY.txt',
  ...['audio', 'compressor', 'conversor', 'corte', 'metadados', 'miniatura', 'whatsapp'].map(name => `guides/${name}.jpg`),
  ...['arrow-right', 'arrow-up-right', 'audio-lines', 'check', 'chevron-down', 'download', 'film', 'hard-drive', 'image', 'maximize', 'message-circle', 'minimize-2', 'pause', 'play', 'rotate-ccw', 'scissors', 'search', 'shield-check', 'upload', 'volume-2', 'volume-x', 'x'].map(name => `icons/${name}.svg`)
].map(name => `_portal/${name}`));
export function packageFiles(routes, aliases, production, publicPreview = false) { return [...routes.filter(route => production || publicPreview || route.group !== 'error').map(route => route.file), ...aliases.map(alias => alias.source), ...publicAssets, 'CNAME', 'robots.txt', 'sitemap.xml'].sort(); }
export function publicBytes(file, data) {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return /\.(html|css|js|svg|txt|xml)$/i.test(file) ? Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n')) : bytes;
}
