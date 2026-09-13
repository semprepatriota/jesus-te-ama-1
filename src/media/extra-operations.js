import { Input, BlobSource, WAVE, MP4, Output, Mp4OutputFormat, WavOutputFormat, StreamTarget, Conversion, Quality, CanvasSink, AudioSampleSink, canEncodeAudio } from 'mediabunny';
import { inputFor, describe, validateOutput } from './core.js';
import { LIMITS, fail, exportSettings } from './policy.js';
import { BoundedOutput } from './bounded-output.js';
import { metadataFields, removeMetadata, cutRange } from './metadata-policy.js';

function progressCallback(conversion, store, callback) {
  let previous = -Infinity;
  conversion.onProgress = (progress, seconds) => {
    const now = performance.now(); if (now - previous < 100 && progress < 1) return; previous = now;
    callback({ stage: 'converting', progress: Math.min(.98, progress), processedSeconds: seconds, outputBytes: store.length });
  };
}
export async function operate(file, operation, options = {}, limits = LIMITS, onProgress = () => {}) {
  const input = inputFor(file, limits), store = new BoundedOutput(limits.outputBytes), started = performance.now();
  let output;
  try {
    const { metadata, video, audio } = await describe(input, limits);
    if (operation === 'thumbnail') {
      const timestamp = options.timestamp;
      if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp >= metadata.duration) fail('INVALID_TIMESTAMP', 'Escolha um instante dentro do video, antes do final.');
      if (!metadata.videoDecodable || metadata.hdr) fail('CODEC_UNSUPPORTED', 'Captura deste codec ou HDR nao foi validada.');
      if (!['png', 'jpeg'].includes(options.format || 'png')) fail('INVALID_OPTIONS', 'Formato de imagem invalido.');
      const sink = new CanvasSink(video, { poolSize: 1 });
      const frame = await sink.getCanvas(timestamp); if (!frame) fail('INVALID_FRAME', 'Nenhum quadro decodificavel nesse instante.');
      const mime = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const blob = await frame.canvas.convertToBlob({ type: mime, quality: .92 });
      if (!blob.size || blob.size > limits.outputBytes || blob.type !== mime) fail('INVALID_OUTPUT', 'A imagem nao corresponde ao formato esperado.');
      const bitmap = await createImageBitmap(blob);
      try { if (bitmap.width !== metadata.width || bitmap.height !== metadata.height) fail('INVALID_OUTPUT', 'Proporcao ou orientacao incorreta na imagem.'); } finally { bitmap.close(); }
      return { blob, metadata: { width: metadata.width, height: metadata.height, requestedTime: timestamp, frameTime: frame.timestamp, frameDuration: frame.duration }, operation, extension: options.format === 'jpeg' ? 'jpg' : 'png', metrics: { elapsedMs: performance.now() - started, outputBytes: blob.size } };
    }
    let settings, config, extension = 'mp4', mime = 'video/mp4', trim;
    if (operation === 'clean') {
      if (!['MP4', 'QuickTime File Format'].includes(metadata.container) || !metadata.capabilities.copyMp4) fail('CLEAN_UNSUPPORTED', 'Limpeza inicial aceita MP4/MOV com H.264 e AAC, sem trilhas extras.');
      const tags = await input.getMetadataTags(), cleaned = removeMetadata(tags, options.selected);
      if (Object.keys(tags.raw || {}).some(key => /chpl|chapter/i.test(key))) fail('CLEAN_AUXILIARY', 'Capitulos nao homologados neste arquivo. Nenhuma trilha ou capitulo sera removido silenciosamente.');
      settings = exportSettings(metadata, { mode: 'copy' });
      config = { copy: { mode: 'forced' }, tags: cleaned, video: { codec: 'avc' }, audio: { codec: 'aac' } };
    } else if (operation === 'cut') {
      trim = cutRange(options, metadata.duration);
      settings = exportSettings(metadata, { maxHeight: options.maxHeight || 1080 });
      if (!metadata.capabilities.transcodeMp4 || audio && !await canEncodeAudio('aac', { numberOfChannels: metadata.audio.channels, sampleRate: metadata.audio.sampleRate })) fail('CODEC_UNSUPPORTED', 'O navegador nao oferece codecs para corte exato com audio.');
      config = { trim, copy: false, video: { codec: 'avc', width: settings.width, height: settings.height, fit: 'contain', quality: new Quality({ bitrate: settings.bitrate }), forceTranscode: true, allowRotationMetadata: false }, audio: { codec: 'aac', quality: new Quality({ bitrate: 128000 }), forceTranscode: true } };
    } else if (operation === 'audio') {
      if (!audio) fail('NO_AUDIO', 'Este video nao possui trilha de audio.');
      if (!metadata.audio.decodable) fail('CODEC_UNSUPPORTED', 'O codec de audio nao pode ser decodificado neste navegador.');
      const format = options.format || 'wav';
      if (!['wav', 'm4a'].includes(format)) fail('INVALID_OPTIONS', 'Escolha WAV ou M4A. MP3 nao esta habilitado.');
      if (format === 'm4a' && metadata.audio.codec !== 'aac' && !await canEncodeAudio('aac', { numberOfChannels: metadata.audio.channels, sampleRate: metadata.audio.sampleRate })) fail('CODEC_UNSUPPORTED', 'O codificador AAC nao esta disponivel.');
      extension = format; mime = format === 'wav' ? 'audio/wav' : 'audio/mp4';
      config = { video: { discard: true }, tags: {}, audio: format === 'wav' ? { codec: 'pcm-s16', sampleRate: 48000, forceTranscode: true } : { codec: 'aac' } };
    } else fail('INVALID_OPERATION', 'Operacao desconhecida.');
    output = new Output({ format: extension === 'wav' ? new WavOutputFormat() : new Mp4OutputFormat({ fastStart: false, ...(operation === 'clean' ? { metadataFormat: 'mdta' } : {}) }), target: new StreamTarget(new WritableStream({ write: chunk => store.write(chunk) }), { chunked: true, chunkSize: 1024 ** 2 }) });
    const conversion = await Conversion.init({ input, output, tracks: 'all', showWarnings: false, ...config });
    const discarded = conversion.discardedTracks.filter(item => !(operation === 'audio' && item.track === video && item.reason === 'discarded_by_user'));
    if (!conversion.isValid || discarded.length || !conversion.utilizedTracks.includes(audio || video) || operation !== 'audio' && !conversion.utilizedTracks.includes(video)) fail('CODEC_UNSUPPORTED', 'Uma trilha nao pode ser preservada. Operacao interrompida.');
    progressCallback(conversion, store, onProgress); await conversion.execute();
    const blob = store.toBlob(mime); if (!blob.size) fail('INVALID_OUTPUT', 'Saida vazia.');
    onProgress({ stage: 'validating', progress: .98, processedSeconds: metadata.duration });
    let resultMetadata, comparison;
    if (operation === 'audio') {
      const check = new Input({ formats: [WAVE, MP4], source: new BlobSource(blob, { maxCacheSize: limits.readCacheBytes }) });
      try {
        const tracks = await check.getTracks(), track = await check.getPrimaryAudioTrack();
        const duration = await check.computeDuration();
        if (tracks.length !== 1 || !track || Math.abs(duration - metadata.duration) > .25 || await track.getCodec() !== (extension === 'wav' ? 'pcm-s16' : 'aac')) fail('INVALID_OUTPUT', 'Formato, trilha ou duracao de audio incorretos.');
        const sample = await new AudioSampleSink(track).getSample(await track.getFirstTimestamp()); if (!sample) fail('INVALID_OUTPUT', 'Saida de audio nao decodificavel.'); sample.close();
        resultMetadata = { duration, codec: await track.getCodec(), channels: await track.getNumberOfChannels(), sampleRate: await track.getSampleRate() };
      } finally { check.dispose(); }
    } else {
      const source = trim ? { ...metadata, duration: trim.end - trim.start } : metadata;
      resultMetadata = await validateOutput(blob, source, settings, limits);
      if (operation === 'clean') {
        const before = metadata.fields, after = resultMetadata.fields;
        const stillPresent = options.selected.filter(id => after.some(field => field.id === id));
        if (stillPresent.length) fail('METADATA_REMAINS', 'Um campo escolhido ainda aparece na reinspecao. Download bloqueado.');
        const changed = before.filter(field => !options.selected.includes(field.id) && !after.some(next => next.id === field.id && next.value === field.value));
        if (changed.length) fail('UNSELECTED_METADATA_CHANGED', 'Um campo nao escolhido seria alterado; esta copia nao sera disponibilizada.');
        comparison = { before, after, removed: options.selected, checked: true, note: 'Campos descritivos inspecionados. Datas tecnicas internas recriadas pelo muxer permanecem; campos proprietarios fora da leitura nao sao certificados.' };
      }
    }
    return { blob, metadata: resultMetadata, operation, extension, comparison, range: trim, metrics: { elapsedMs: performance.now() - started, inputBytes: file.size, outputBytes: blob.size, peakOutputBlocksBytes: store.peakAllocatedBytes } };
  } catch (error) { if (output && !['finalized', 'canceled'].includes(output.state)) await output.cancel().catch(() => {}); throw error; }
  finally { input.dispose(); store.dispose(); }
}
