import { Input, MP4, QTFF, WEBM, BlobSource, Output, Mp4OutputFormat, StreamTarget, Conversion, Quality, canEncodeVideo, canEncodeAudio, VideoSampleSink, AudioSampleSink } from 'mediabunny';
import { LIMITS, fail, validateFile, validateMetadata, exportSettings } from './policy.js';
import { BoundedOutput } from './bounded-output.js';
import { metadataFields } from './metadata-policy.js';

export function inputFor(file, limits) {
  validateFile(file, limits);
  return new Input({ formats: [MP4, QTFF, WEBM], source: new BlobSource(file, { maxCacheSize: limits.readCacheBytes, handleUnhandledError: () => {} }) });
}

export async function describe(input, limits) {
  const tracks = await input.getTracks();
  const videoTracks = tracks.filter(track => track.type === 'video');
  const audioTracks = tracks.filter(track => track.type === 'audio');
  if (videoTracks.length !== 1 || audioTracks.length > 1 || tracks.some(track => !['video', 'audio'].includes(track.type))) fail('TRACKS_UNSUPPORTED', 'Esta base aceita um video com no maximo uma trilha de audio, sem outras trilhas.');
  const video = videoTracks[0];
  const audio = audioTracks[0];
  const duration = await input.computeDuration();
  const codec = await video.getCodec();
  const metadata = {
    container: (await input.getFormat()).name,
    mime: await input.getMimeType(), duration,
    width: await video.getDisplayWidth(), height: await video.getDisplayHeight(),
    codedWidth: await video.getCodedWidth(), codedHeight: await video.getCodedHeight(),
    rotation: await video.getRotation(), codec,
    frameRate: (await video.computeFrameRateMetrics()).bestGuessFrameRate,
    colorSpace: await video.getColorSpace(), hdr: await video.hasHighDynamicRange(),
    videoDecodable: false, audio: null,
  };
  if (audio) metadata.audio = { codec: await audio.getCodec(), channels: await audio.getNumberOfChannels(), sampleRate: await audio.getSampleRate(), decodable: false };
  validateMetadata(metadata, limits);
  // Guard coded dimensions too; an unusual pixel aspect ratio must not bypass the decoder budget.
  if (metadata.codedWidth * metadata.codedHeight > limits.pixels) fail('RESOLUTION_LIMIT', 'As dimensoes codificadas excedem o limite local.');
  metadata.videoDecodable = Boolean(codec) && await video.canDecode();
  if (audio) metadata.audio.decodable = Boolean(metadata.audio.codec) && await audio.canDecode();
  const settings = exportSettings(metadata, { mode: 'copy' });
  const h264Encodable = await canEncodeVideo('avc', { width: settings.width, height: settings.height, quality: new Quality({ bitrate: settings.bitrate }) });
  const aacEncodable = !audio || metadata.audio.codec === 'aac' || await canEncodeAudio('aac', { numberOfChannels: metadata.audio.channels, sampleRate: metadata.audio.sampleRate, quality: new Quality({ bitrate: 128000 }) });
  metadata.capabilities = {
    copyMp4: codec === 'avc' && (!audio || metadata.audio.codec === 'aac'),
    transcodeMp4: !metadata.hdr && metadata.videoDecodable && h264Encodable && (!audio || metadata.audio.decodable && aacEncodable),
    h264Encodable, aacEncodable,
  };
  metadata.fields = metadataFields(await input.getMetadataTags());
  return { metadata, video, audio };
}

export async function analyze(file, limits = LIMITS) {
  const input = inputFor(file, limits);
  try { return (await describe(input, limits)).metadata; }
  finally { input.dispose(); }
}

export async function validateOutput(blob, source, settings, limits) {
  const input = inputFor(blob, { ...limits, inputBytes: limits.outputBytes });
  try {
    const { metadata, video, audio } = await describe(input, limits);
    if (metadata.codec !== 'avc' || Boolean(audio) !== Boolean(source.audio) || (audio && metadata.audio.codec !== 'aac')) fail('INVALID_OUTPUT', 'As trilhas da saida nao correspondem ao esperado.');
    if (Math.abs(metadata.duration - source.duration) > Math.max(.25, 2 / source.frameRate)) fail('INVALID_OUTPUT', 'A duracao da saida nao corresponde ao original.');
    const width = settings.mode === 'copy' ? source.width : settings.width;
    const height = settings.mode === 'copy' ? source.height : settings.height;
    if (metadata.width !== width || metadata.height !== height) fail('INVALID_OUTPUT', 'As dimensoes ou a orientacao da saida nao correspondem ao esperado.');
    if (settings.mode === 'copy' && metadata.rotation !== source.rotation) fail('INVALID_OUTPUT', 'A rotacao nao foi preservada.');
    if (!metadata.videoDecodable || (audio && !metadata.audio.decodable)) fail('INVALID_OUTPUT', 'A saida nao pode ser decodificada neste navegador.');
    const sample = await new VideoSampleSink(video).getSample(await video.getFirstTimestamp());
    if (!sample) fail('INVALID_OUTPUT', 'A saida nao possui quadro inicial decodificavel.');
    sample.close();
    if (audio) {
      const sound = await new AudioSampleSink(audio).getSample(await audio.getFirstTimestamp());
      if (!sound) fail('INVALID_OUTPUT', 'A saida nao possui audio inicial decodificavel.');
      sound.close();
    }
    return metadata;
  } finally { input.dispose(); }
}

export async function exportMp4(file, options = {}, limits = LIMITS, onProgress = () => {}) {
  const started = performance.now();
  const input = inputFor(file, limits);
  const store = new BoundedOutput(limits.outputBytes);
  let output;
  try {
    const { metadata, video, audio } = await describe(input, limits);
    const settings = exportSettings(metadata, options);
    if (settings.mode === 'copy' && !metadata.capabilities.copyMp4) fail('COPY_UNSUPPORTED', 'Este arquivo precisa de conversao de codec para MP4 H.264/AAC.');
    if (settings.mode === 'transcode') {
      if (!metadata.capabilities.transcodeMp4) fail('CODEC_UNSUPPORTED', 'O navegador nao oferece os codecs necessarios para esta conversao.');
      if (!await canEncodeVideo('avc', { width: settings.width, height: settings.height, quality: new Quality({ bitrate: settings.bitrate }) })) fail('CODEC_UNSUPPORTED', 'A configuracao H.264 escolhida nao e suportada neste navegador.');
    }
    output = new Output({ format: new Mp4OutputFormat({ fastStart: false }), target: new StreamTarget(new WritableStream({ write: chunk => store.write(chunk) }), { chunked: true, chunkSize: 1024 ** 2 }) });
    const conversion = await Conversion.init({
      input, output, tracks: 'all', showWarnings: false,
      video: settings.mode === 'copy' ? { codec: 'avc' } : { codec: 'avc', width: settings.width, height: settings.height, fit: 'contain', quality: new Quality({ bitrate: settings.bitrate }), forceTranscode: true, allowRotationMetadata: false },
      audio: audio && metadata.audio.codec !== 'aac' ? { codec: 'aac', quality: new Quality({ bitrate: 128000 }), forceTranscode: true } : { codec: 'aac' },
    });
    if (!conversion.isValid || conversion.discardedTracks.length || !conversion.utilizedTracks.includes(video) || audio && !conversion.utilizedTracks.includes(audio)) fail('CODEC_UNSUPPORTED', 'Uma trilha nao pode ser preservada; a exportacao foi interrompida.');
    let lastProgressTime = -Infinity;
    conversion.onProgress = (progress, processedTime) => {
      const now = performance.now();
      if (now - lastProgressTime < 100 && progress < 1) return;
      lastProgressTime = now;
      onProgress({ stage: 'converting', progress: Math.min(.98, Math.max(0, progress)), processedSeconds: processedTime, outputBytes: store.length });
    };
    await conversion.execute();
    onProgress({ stage: 'validating', progress: .98, processedSeconds: metadata.duration, outputBytes: store.length });
    const blob = store.toBlob('video/mp4');
    if (!blob.size) fail('INVALID_OUTPUT', 'Nenhum video foi produzido.');
    const outputMetadata = await validateOutput(blob, metadata, settings, limits);
    return { blob, metadata: outputMetadata, mode: settings.mode, metrics: { elapsedMs: performance.now() - started, inputBytes: file.size, outputBytes: blob.size, peakOutputBlocksBytes: store.peakAllocatedBytes, readCacheBudgetBytes: limits.readCacheBytes } };
  } catch (error) {
    if (output && !['finalized', 'canceled'].includes(output.state)) await output.cancel().catch(() => {});
    throw error;
  } finally { input.dispose(); store.dispose(); }
}
