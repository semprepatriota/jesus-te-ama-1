export const LIMITS = Object.freeze({
  inputBytes: 32 * 1024 ** 2,
  outputBytes: 48 * 1024 ** 2,
  durationSeconds: 120,
  pixels: 1920 * 1080,
  frameRate: 60,
  audioChannels: 2,
  readCacheBytes: 2 * 1024 ** 2,
  timeoutMs: 180000,
});

export class MediaError extends Error {
  constructor(code, message) { super(message); this.name = 'MediaError'; this.code = code; }
}

export function fail(code, message) { throw new MediaError(code, message); }

export function validateFile(file, limits = LIMITS) {
  if (!(file instanceof Blob) || file.size === 0) fail('INVALID_FILE', 'Escolha um arquivo de video nao vazio.');
  if (file.size > limits.inputBytes) fail('INPUT_LIMIT', 'O arquivo excede o limite inicial de processamento local.');
}

export function validateMetadata(metadata, limits = LIMITS) {
  if (!Number.isFinite(metadata.duration) || metadata.duration <= 0) fail('INVALID_DURATION', 'A duracao do video nao pode ser verificada.');
  if (metadata.duration > limits.durationSeconds) fail('DURATION_LIMIT', 'O video excede a duracao inicial permitida.');
  if (!Number.isSafeInteger(metadata.width) || !Number.isSafeInteger(metadata.height) || metadata.width <= 0 || metadata.height <= 0) fail('INVALID_DIMENSIONS', 'As dimensoes do video sao invalidas.');
  if (metadata.width * metadata.height > limits.pixels) fail('RESOLUTION_LIMIT', 'A resolucao excede o limite inicial de processamento local.');
  if (!Number.isFinite(metadata.frameRate) || metadata.frameRate <= 0 || metadata.frameRate > limits.frameRate + .1) fail('FRAME_RATE_LIMIT', 'A taxa de quadros nao esta dentro dos limites iniciais.');
  if (metadata.audio && metadata.audio.channels > limits.audioChannels) fail('AUDIO_CHANNEL_LIMIT', 'Audio com mais de dois canais ainda nao foi validado.');
}

export function exportSettings(metadata, options = {}) {
  if (!['copy', 'transcode'].includes(options.mode ?? 'transcode')) fail('INVALID_OPTIONS', 'Modo de exportacao invalido.');
  const mode = options.mode ?? 'transcode';
  const maxHeight = options.maxHeight ?? 720;
  const bitrate = options.bitrate ?? 2000000;
  if (!Number.isFinite(maxHeight) || maxHeight < 144 || maxHeight > 1080 || !Number.isFinite(bitrate) || bitrate < 100000 || bitrate > 10000000) fail('INVALID_OPTIONS', 'Configuracao de exportacao fora dos limites.');
  const scale = Math.min(1, maxHeight / metadata.height);
  const width = Math.max(2, Math.floor(metadata.width * scale / 2) * 2);
  const height = Math.max(2, Math.floor(metadata.height * scale / 2) * 2);
  if (mode === 'transcode' && metadata.hdr) fail('HDR_UNSUPPORTED', 'Conversao de HDR ainda nao foi validada; o arquivo nao sera alterado.');
  return { mode, width, height, bitrate };
}
