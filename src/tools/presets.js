export const QUALITY = Object.freeze({ small: 700000, balanced: 1500000, high: 3000000 });
export const MAX_ATTEMPTS = 2;
const MB = 1024 ** 2;
export function compressionOptions(quality, height) {
  if (!(quality in QUALITY) || ![480, 720, 1080].includes(height)) throw new Error('Configuracao invalida.');
  return { mode: 'transcode', maxHeight: height, bitrate: QUALITY[quality] };
}
export function whatsappOptions(metadata, targetMiB, height, previous) {
  if (![4, 8, 16].includes(targetMiB) || ![480, 720].includes(height) || !Number.isFinite(metadata.duration) || metadata.duration <= 0) throw new Error('Meta invalida.');
  const targetBytes = targetMiB * MB;
  const audioReserve = metadata.audio ? 256000 : 0;
  let bitrate = Math.max(100000, Math.min(2500000, Math.floor(targetBytes * 8 * .85 / metadata.duration - audioReserve)));
  if (previous) {
    if (!Number.isFinite(previous.outputBytes) || previous.outputBytes <= 0 || !Number.isFinite(previous.bitrate)) throw new Error('Tentativa invalida.');
    bitrate = Math.max(100000, Math.min(bitrate, Math.floor(previous.bitrate * Math.min(.8, targetBytes / previous.outputBytes * .85))));
  }
  return { mode: 'transcode', maxHeight: previous ? Math.min(height, 480) : height, bitrate, targetBytes };
}
export function comparison(inputBytes, outputBytes, targetBytes) {
  if (!Number.isFinite(inputBytes) || inputBytes <= 0 || !Number.isFinite(outputBytes) || outputBytes <= 0) throw new Error('Tamanho invalido.');
  return { reduced: outputBytes < inputBytes, percent: (1 - outputBytes / inputBytes) * 100, targetMet: targetBytes == null ? null : outputBytes <= targetBytes };
}
