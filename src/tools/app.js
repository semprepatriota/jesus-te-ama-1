import { compressionOptions, whatsappOptions, comparison, MAX_ATTEMPTS } from './presets.js';
import { failureCategory } from '../measurement/controller.js';
let measurementJob = null;
function endMeasurement(outcome, code) { window.hfMeasurement?.finish(measurementJob, outcome, failureCategory(code)); measurementJob = null; }

const tool = document.body.dataset.tool;
const isWhatsApp = tool === 'video-para-whatsapp';
const isConverter = tool === 'converter-para-mp4';
const $ = selector => document.querySelector(selector);
const icon = (name, size = 18) => `<img src="../_portal/icons/${name}.svg" alt="" width="${size}" height="${size}">`;
const config = {
  'comprimir-video': { subtitle: 'Uma c\u00f3pia mais leve, sem abrir m\u00e3o do original.', heading: 'Tamanho & qualidade', action: 'Comprimir v\u00eddeo' },
  'video-para-whatsapp': { subtitle: 'Seu v\u00eddeo no ritmo da conversa.', heading: 'Preparar para a conversa', action: 'Preparar v\u00eddeo' },
  'converter-para-mp4': { subtitle: 'Um formato para mais destinos.', heading: 'Convers\u00e3o para MP4', action: 'Gerar MP4' },
}[tool];
const resolutions = (whatsapp = false) => `<div class="field"><label class="field-label" for="height">Altura m\u00e1xima</label><select id="height"><option value="720">720 px</option><option value="480">480 px</option>${whatsapp ? '' : '<option value="1080">1080 px</option>'}</select></div>`;
let controls;
if (isWhatsApp) controls = `<fieldset><legend>Meta de tamanho</legend><div class="segments"><label><input type="radio" name="target" value="4" checked><span>4 MiB</span></label><label><input type="radio" name="target" value="8"><span>8 MiB</span></label><label><input type="radio" name="target" value="16"><span>16 MiB</span></label></div><p class="field-note">Meta para esta c\u00f3pia, n\u00e3o um limite universal do WhatsApp.</p></fieldset>${resolutions(true)}<p class="compatibility">MP4 / H.264 e AAC. At\u00e9 duas tentativas para atingir a meta; o aplicativo ainda pode recomprimir o v\u00eddeo.</p>`;
else if (isConverter) controls = `<fieldset><legend>Opera\u00e7\u00e3o</legend><div class="mode-options"><label><input type="radio" name="mode" value="transcode" checked>Converter para H.264 / AAC</label><label><input type="radio" name="mode" value="copy" id="copy-mode" disabled>Reempacotar sem recomprimir</label></div></fieldset>${resolutions()}<p class="compatibility" id="copy-note">Reempacotamento dispon\u00edvel apenas para H.264/AAC compat\u00edvel. A convers\u00e3o pode alterar a qualidade.</p>`;
else controls = `<fieldset><legend>Qualidade da c\u00f3pia</legend><div class="segments"><label><input type="radio" name="quality" value="small"><span>Mais leve</span></label><label><input type="radio" name="quality" value="balanced" checked><span>Equilibrada</span></label><label><input type="radio" name="quality" value="high"><span>Mais detalhe</span></label></div></fieldset>${resolutions()}<p class="compatibility">A recompress\u00e3o pode perder detalhes. O tamanho final depende do conte\u00fado; nem todo v\u00eddeo fica menor.</p>`;
$('#tool-root').innerHTML = `<div class="tool-intro"><p>${config.subtitle}</p><span class="local-note">${icon('shield-check')}Sem upload</span></div><nav class="tool-tabs" aria-label="Ferramentas iniciais">${[['comprimir-video','Comprimir','minimize-2'],['video-para-whatsapp','WhatsApp','message-circle'],['converter-para-mp4','Converter MP4','film']].map(([slug,label,image]) => `<a href="../${slug}/index.html"${tool === slug ? ' aria-current="page"' : ''}>${icon(image,17)}${label}</a>`).join('')}</nav><section class="editor" aria-label="Processamento local"><div class="media-column"><div class="media-toolbar"><div class="view-tabs" role="group" aria-label="Pr\u00e9via"><button id="view-original" aria-pressed="true">Original</button><button id="view-result" aria-pressed="false" disabled>Resultado</button></div><button class="icon-button" id="reset" title="Remover v\u00eddeo" aria-label="Remover v\u00eddeo" disabled>${icon('x')}</button></div><div class="video-stage" id="dropzone" data-loaded="false"><video id="video" playsinline controls preload="none" poster="../_portal/amostra.jpg" aria-label="Pr\u00e9via do v\u00eddeo"></video><span class="sample-label">IMAGEM DE AMOSTRA</span></div><div class="file-row">${icon('film',16)}<span class="file-name" id="file-name">Nenhum v\u00eddeo selecionado</span><span class="file-size" id="file-size"></span></div><div id="source-info" class="source-info"></div></div><div class="settings"><h2>${config.heading}</h2><button class="upload-button" id="choose">${icon('upload')}Selecionar v\u00eddeo</button><input id="file" type="file" accept="video/mp4,video/webm,video/quicktime,.mov" hidden><div id="options">${controls}</div><div class="output-format">${icon('film',16)}<span>MP4 \u00b7 H.264${isConverter ? ' / AAC quando h\u00e1 \u00e1udio' : ' / AAC'}</span></div><button class="primary" id="export" disabled>${icon('arrow-right')}${config.action}</button></div></section><section class="status-area" id="status-area"><div class="status-line"><strong id="status-title">Aguardando v\u00eddeo</strong><div><span id="percent"></span><button class="cancel" id="cancel" hidden>Cancelar</button></div></div><progress id="progress" value="0" max="1"></progress><p id="status-message" role="status" aria-live="polite">MP4, MOV ou WebM \u00b7 at\u00e9 32 MiB \u00b7 2 minutos \u00b7 1080p / 60 fps \u00b7 \u00e1udio mono ou est\u00e9reo</p></section><section class="result" id="result" aria-label="Resultado da exporta\u00e7\u00e3o" hidden><div><div class="result-stats"><div><span>ORIGINAL</span><strong id="original-size"></strong></div><div><span>RESULTADO</span><strong id="result-size"></strong></div><div><span id="comparison-label">DIFEREN\u00c7A</span><strong id="comparison"></strong></div></div><p class="result-note" id="result-note"></p></div><div class="result-actions"><a class="download" id="download" download="video-hf.mp4">${icon('download')}Baixar MP4</a><button class="share" id="share" hidden>Compartilhar arquivo</button></div></section><section class="domain-notes"><div><h2>Sobre esta c\u00f3pia.</h2><p>O original n\u00e3o \u00e9 substitu\u00eddo. Formato, resolu\u00e7\u00e3o e qualidade s\u00e3o escolhas diferentes.</p></div><div><details><summary>O v\u00eddeo pode ficar maior?</summary><p>Sim. Um original j\u00e1 muito comprimido pode ficar maior ao ser recodificado. Compare os tamanhos reais e preserve o original.</p></details><details><summary>${isWhatsApp ? 'Essas metas s\u00e3o o limite do WhatsApp?' : 'Trocar a extens\u00e3o converte o arquivo?'}</summary><p>${isWhatsApp ? 'N\u00e3o. O limite de envio depende do aplicativo, da conex\u00e3o e da forma de anexar. Os valores aqui s\u00e3o metas escolhidas para a c\u00f3pia. Consulte a <a href="https://faq.whatsapp.com/453914586839706/" target="_blank" rel="noopener noreferrer">Central de Ajuda do WhatsApp</a>.' : 'N\u00e3o. MP4 \u00e9 um cont\u00eainer; o conte\u00fado precisa ser reempacotado ou convertido com codecs compat\u00edveis.'}</p></details><details><summary>Quais arquivos ainda n\u00e3o est\u00e3o homologados?</summary><p>Arquivos acima dos limites indicados, HDR para recompress\u00e3o, legendas, v\u00e1rias trilhas e \u00e1udio multicanal. A disponibilidade de codecs varia entre navegadores. Celulares f\u00edsicos ainda precisam de valida\u00e7\u00e3o.</p></details></div></section>`;

$('.output-format span').textContent = 'MP4 \u00b7 H.264 / AAC quando h\u00e1 \u00e1udio';
let engine, engineLoading, metadata, selectedFile, previewUrl, output, busy = false, generation = 0, attempt = 0;
const history = [];
function size(bytes) { return `${(bytes / 1024 ** 2).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MiB`; }
function status(title, message, error = false) { $('#status-title').textContent = title; $('#status-message').textContent = message; $('#status-area').dataset.error = String(error); }
function renderButtons() {
  const mode = isConverter ? $('[name="mode"]:checked').value : 'transcode';
  const compatible = metadata && (mode === 'copy' ? metadata.capabilities.copyMp4 && metadata.videoDecodable && (!metadata.audio || metadata.audio.decodable) : metadata.capabilities.transcodeMp4);
  $('#export').disabled = busy || !compatible;
  $('#cancel').hidden = !busy;
  $('#reset').disabled = !selectedFile;
  $('#options').querySelectorAll('input,select').forEach(control => { control.disabled = busy || control.id === 'copy-mode' && !metadata?.capabilities.copyMp4; });
  if (isConverter) $('#height').disabled = busy || mode === 'copy';
}
function clearResult() {
  output = null; $('#result').hidden = true; $('#view-result').disabled = true; $('#download').removeAttribute('href'); $('#share').hidden = true;
}
function showView(result = false) {
  const video = $('#video'); video.pause();
  const url = result && output ? engine.downloadUrl() : previewUrl;
  if (url) { video.removeAttribute('poster'); video.src = url; $('#dropzone').dataset.loaded = 'true'; }
  else { video.removeAttribute('src'); video.poster = '../_portal/amostra.jpg'; $('#dropzone').dataset.loaded = 'false'; }
  video.load();
  $('#view-original').setAttribute('aria-pressed', String(!result)); $('#view-result').setAttribute('aria-pressed', String(result));
}
function releasePreview() { $('#video').pause(); $('#video').removeAttribute('src'); $('#video').load(); if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null; }
async function getEngine() {
  if (engine) return engine;
  engineLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = new URL('../_portal/engine/engine.js', location.href);
    script.onload = () => resolve(); script.onerror = () => { script.remove(); engineLoading = null; reject(new Error('N\u00e3o foi poss\u00edvel carregar o motor local.')); };
    document.head.append(script);
  });
  await engineLoading;
  engine ??= new HFMedia.VideoEngine({ onState(state) {
    history.push({ phase: state.phase, stage: state.stage, progress: state.progress, processedSeconds: state.processedSeconds, attempt }); if (history.length > 2000) history.shift();
    if (state.phase === 'processing') {
      status(isWhatsApp ? `Preparando v\u00eddeo \u00b7 tentativa ${attempt}/${MAX_ATTEMPTS}` : 'Processando no navegador', state.stage === 'validating' ? 'Conferindo dimens\u00f5es, dura\u00e7\u00e3o e decodifica\u00e7\u00e3o.' : 'Seu arquivo permanece neste dispositivo.');
      $('#progress').value = state.progress || 0; $('#percent').textContent = `${Math.round((state.progress || 0) * 100)}%`;
    }
  } });
  return engine;
}
async function open(file) {
  endMeasurement('cancel');
  const current = ++generation; engine?.cancel(); clearResult(); releasePreview(); metadata = null; selectedFile = file; busy = true; attempt = 0;
  $('#file-name').textContent = file.name || 'V\u00eddeo local'; $('#file-size').textContent = size(file.size); $('#source-info').replaceChildren(); showView(); renderButtons();
  status('Analisando v\u00eddeo', 'Verificando formato e codecs reais. Nenhum upload.'); $('#progress').removeAttribute('value'); $('#percent').textContent = '';
  try {
    const local = await getEngine(); if (current !== generation) return;
    const result = await local.open(file); if (current !== generation) return;
    metadata = result; previewUrl = URL.createObjectURL(file); showView();
    const items = [`${result.width} \u00d7 ${result.height}`, `${result.duration.toFixed(2)} s`, `${result.codec === 'avc' ? 'H.264' : result.codec || 'Codec desconhecido'}`, result.audio ? `${(result.audio.codec || 'desconhecido').toUpperCase()} \u00b7 ${result.audio.channels} canais` : 'Sem \u00e1udio'];
    $('#source-info').replaceChildren(...items.map(text => { const span = document.createElement('span'); span.textContent = text; return span; }));
    if (isConverter) { $('#copy-mode').disabled = !result.capabilities.copyMp4; if (!result.capabilities.copyMp4) $('[name="mode"][value="transcode"]').checked = true; }
    status('V\u00eddeo analisado', result.capabilities.transcodeMp4 ? 'Pronto para gerar uma c\u00f3pia MP4.' : 'Convers\u00e3o indispon\u00edvel neste navegador para este arquivo.');
  } catch (error) { if (current === generation && error.code !== 'CANCELLED') status('Arquivo n\u00e3o dispon\u00edvel', error.message, true); }
  finally { if (current === generation) { busy = false; $('#progress').value = 0; renderButtons(); } }
}
async function run() {
  if (busy || !metadata) return;
  measurementJob = window.hfMeasurement?.start(tool);
  const current = ++generation; busy = true; clearResult(); showView(); renderButtons(); history.length = 0;
  const height = Number($('#height').value); let options, targetBytes, result;
  try {
    if (isWhatsApp) {
      const target = Number($('[name="target"]:checked').value); let previous;
      for (attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        options = whatsappOptions(metadata, target, height, previous); targetBytes = options.targetBytes;
        result = await engine.exportMp4(options); if (current !== generation) return;
        if (result.blob.size <= targetBytes || attempt === MAX_ATTEMPTS) break;
        previous = { bitrate: options.bitrate, outputBytes: result.blob.size };
      }
    } else {
      attempt = 1;
      options = isConverter ? { mode: $('[name="mode"]:checked').value, maxHeight: height, bitrate: 2000000 } : compressionOptions($('[name="quality"]:checked').value, height);
      result = await engine.exportMp4(options); if (current !== generation) return;
    }
    output = { ...result, comparison: comparison(selectedFile.size, result.blob.size, targetBytes), attempts: attempt, options };
    $('#original-size').textContent = size(selectedFile.size); $('#result-size').textContent = size(result.blob.size);
    $('#comparison-label').textContent = isWhatsApp ? 'META DE TAMANHO' : 'DIFEREN\u00c7A';
    const comp = output.comparison;
    $('#comparison').textContent = isWhatsApp ? comp.targetMet ? 'Atingida' : 'Acima da meta' : comp.reduced ? `${comp.percent.toFixed(1)}% menor` : comp.percent === 0 ? 'Mesmo tamanho' : `${Math.abs(comp.percent).toFixed(1)}% maior`;
    $('#comparison').className = (isWhatsApp ? comp.targetMet : comp.reduced) ? 'positive' : 'warning';
    const dimensions = `${result.metadata.width} \u00d7 ${result.metadata.height}`;
    $('#result-note').textContent = `${dimensions} \u00b7 ${result.metadata.duration.toFixed(2)} s \u00b7 H.264${result.metadata.audio ? ' / AAC' : ' \u00b7 sem \u00e1udio'}. ${isWhatsApp ? comp.targetMet ? 'Meta de tamanho atingida. O envio no aplicativo precisa ser conferido no seu aparelho.' : 'A meta n\u00e3o foi atingida ap\u00f3s duas tentativas. Esta c\u00f3pia est\u00e1 acima do tamanho escolhido.' : comp.reduced ? result.mode === 'copy' ? 'Reempacotado, sem recompress\u00e3o das trilhas.' : 'C\u00f3pia menor; confira os detalhes da imagem e guarde o original.' : 'N\u00e3o houve redu\u00e7\u00e3o de tamanho. Guarde o original ou escolha uma qualidade menor.'}`;
    $('#result').hidden = false; $('#view-result').disabled = false; $('#download').href = engine.downloadUrl();
    $('#download').download = isWhatsApp ? 'video-whatsapp-hf.mp4' : isConverter ? 'video-convertido-hf.mp4' : 'video-comprimido-hf.mp4';
    const sharedFile = new File([result.blob], $('#download').download, { type: 'video/mp4' });
    try { $('#share').hidden = !(isWhatsApp && navigator.canShare?.({ files: [sharedFile] }) && navigator.share); } catch { $('#share').hidden = true; }
    status(isWhatsApp && !comp.targetMet ? 'C\u00f3pia acima da meta' : 'MP4 validado', 'Sa\u00edda conferida localmente. Compare a pr\u00e9via antes de baixar.'); $('#progress').value = 1; $('#percent').textContent = '100%'; showView(true);
    endMeasurement('success');
  } catch (error) { if (current === generation && error.code !== 'CANCELLED') { endMeasurement('failure', error.code); clearResult(); status('Exporta\u00e7\u00e3o interrompida', error.message, true); $('#percent').textContent = ''; $('#progress').value = 0; } }
  finally { if (current === generation) { busy = false; renderButtons(); } }
}
function cancel() { endMeasurement('cancel'); generation++; busy = false; engine?.cancel(); clearResult(); showView(); status('Processamento cancelado', 'O worker foi interrompido e a sa\u00edda tempor\u00e1ria foi descartada.'); $('#progress').value = 0; $('#percent').textContent = ''; renderButtons(); }
function reset() { cancel(); engine?.dispose(); releasePreview(); metadata = null; selectedFile = null; $('#file').value = ''; $('#file-name').textContent = 'Nenhum v\u00eddeo selecionado'; $('#file-size').textContent = ''; $('#source-info').replaceChildren(); showView(); status('Aguardando v\u00eddeo', 'MP4, MOV ou WebM \u00b7 at\u00e9 32 MiB \u00b7 2 minutos \u00b7 1080p / 60 fps \u00b7 \u00e1udio mono ou est\u00e9reo'); renderButtons(); }
$('#choose').addEventListener('click', () => { $('#file').value = ''; $('#file').click(); });
$('#file').addEventListener('change', event => { if (event.target.files[0]) void open(event.target.files[0]); });
$('#export').addEventListener('click', () => { void run(); }); $('#cancel').addEventListener('click', cancel); $('#reset').addEventListener('click', reset);
$('#view-original').addEventListener('click', () => showView()); $('#view-result').addEventListener('click', () => showView(true));
$('#options').addEventListener('change', renderButtons);
$('#share').addEventListener('click', async () => {
  if (!output || busy) return; const current = generation;
  try { await navigator.share({ files: [new File([output.blob], $('#download').download, { type: 'video/mp4' })] }); }
  catch (error) { if (current === generation && error.name !== 'AbortError') status('Compartilhamento n\u00e3o conclu\u00eddo', 'O navegador n\u00e3o concluiu o compartilhamento. O download MP4 continua dispon\u00edvel.'); }
});
$('#video').addEventListener('error', () => { if (selectedFile && !busy) status('Pr\u00e9via indispon\u00edvel', 'O player deste navegador n\u00e3o conseguiu reproduzir o arquivo. Confira o suporte de codecs antes de exportar.', true); });
$('#dropzone').addEventListener('dragover', event => { event.preventDefault(); $('#dropzone').classList.add('drop-active'); });
$('#dropzone').addEventListener('dragleave', () => $('#dropzone').classList.remove('drop-active'));
$('#dropzone').addEventListener('drop', event => { event.preventDefault(); $('#dropzone').classList.remove('drop-active'); if (event.dataTransfer.files[0]) void open(event.dataTransfer.files[0]); });
window.addEventListener('pagehide', () => { generation++; engine?.dispose(); releasePreview(); });
window.hfTool = { open, cancel, reset, run, history, get engine() { return engine; }, get output() { return output; }, get metadata() { return metadata; }, get busy() { return busy; } };
renderButtons();
