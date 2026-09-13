import { fail } from './policy.js';
const labels = { title: 'Titulo', artist: 'Autor / artista', comment: 'Comentario', description: 'Descricao', date: 'Data descritiva', album: 'Album', albumArtist: 'Autor do album', genre: 'Genero', lyrics: 'Texto / letra', images: 'Capas e imagens anexas' };
export function normalizedKey(raw) {
  const aliases = { '\u00a9nam': 'title', '\u00a9ART': 'artist', '\u00a9cmt': 'comment', '\u00a9des': 'description', '\u00a9day': 'date', '\u00a9alb': 'album', aART: 'albumArtist', '\u00a9gen': 'genre', '\u00a9lyr': 'lyrics', covr: 'images', album_artist: 'albumArtist' };
  if (Object.hasOwn(aliases,raw)) return aliases[raw];
  const key = raw.replace(/^com\.apple\.quicktime\./, '');
  if (key === 'author') return 'artist';
  if (key === 'creationdate') return 'date';
  return Object.hasOwn(labels,key) ? key : null;
}
function valueText(value) {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) return `Campo binario: ${value.byteLength} bytes`;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `${value.length} itens`;
  if (value?.data instanceof Uint8Array) return `Anexo: ${value.data.byteLength} bytes`;
  return 'Campo estruturado';
}
export function metadataFields(tags) {
  const fields = [];
  for (const [key, value] of Object.entries(tags)) {
    if (key !== 'raw' && value != null) fields.push({ id: key, label: labels[key] || key, value: valueText(value) });
  }
  for (const [key, value] of Object.entries(tags.raw || {})) {
    if (value == null || normalizedKey(key) && tags[normalizedKey(key)] != null) continue;
    fields.push({ id: `raw:${key}`, label: /location|xyz|loci/i.test(key) ? `Localizacao (${key})` : key, value: valueText(value) });
  }
  if (fields.length > 128 || fields.some(field => field.value.length > 4096)) fail('METADATA_LIMIT', 'Metadados muito extensos para esta base. Nenhum campo sera omitido silenciosamente.');
  return fields;
}
export function removeMetadata(tags, selected) {
  const available = metadataFields(tags);
  if (!Array.isArray(selected) || !selected.length || new Set(selected).size !== selected.length || selected.some(id => !available.some(field => field.id === id))) fail('INVALID_SELECTION', 'Escolha campos encontrados neste video.');
  const clean = { ...tags, raw: { ...tags.raw } };
  for (const id of selected) {
    const key = id.startsWith('raw:') ? id.slice(4) : id;
    const normalized = id.startsWith('raw:') ? normalizedKey(key) : key;
    if (normalized) delete clean[normalized];
    delete clean.raw[key];
    for (const alias of Object.keys(clean.raw)) if (normalized && normalizedKey(alias) === normalized) delete clean.raw[alias];
  }
  return clean;
}
export function cutRange(options, duration) {
  const { start, end } = options;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > duration || end <= start || end - start < .2 - 1e-8) fail('INVALID_RANGE', 'Escolha inicio e fim validos, com pelo menos 0,2 segundo.');
  return { start, end };
}
