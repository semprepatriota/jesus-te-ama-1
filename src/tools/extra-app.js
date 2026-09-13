import { failureCategory } from '../measurement/controller.js';
import { metadataAdvice, recommendedFields } from '../media/metadata-advice.js';
let measurementJob = null;
function endMeasurement(outcome, code) { window.hfMeasurement?.finish(measurementJob, outcome, failureCategory(code)); measurementJob = null; }
const tool = document.body.dataset.tool;
const configs = {
  'cortar-video': { operation: 'cut', heading: 'Seu trecho, do in\u00edcio ao fim.', action: 'Gerar trecho MP4', icon: 'scissors' },
  'limpar-metadados-video': { operation: 'clean', heading: 'Escolha os dados que ficam.', action: 'Gerar c\u00f3pia e reinspecionar', icon: 'shield-check' },
  'extrair-audio': { operation: 'audio', heading: 'D\u00ea espa\u00e7o ao som.', action: 'Extrair \u00e1udio', icon: 'audio-lines' },
  'capturar-miniatura': { operation: 'thumbnail', heading: 'Um instante. Uma imagem.', action: 'Capturar quadro', icon: 'image' },
};
const config = configs[tool], operation = config.operation;
const $ = selector => document.querySelector(selector);
const icon = name => `<img src="../_portal/icons/${name}.svg" width="18" height="18" alt="">`;
let controls = '';
if (operation === 'cut') controls = `<div class="range-row"><div><label class="field-label" for="start">In\u00edcio (segundos)</label><input id="start" type="number" min="0" step="0.01" value="0"><input id="trim-start" type="range" min="0" max="1" step="0.01" value="0" aria-label="Inicio do corte"><button class="point-button" id="set-start">${icon('play')}Usar instante atual</button></div><div><label class="field-label" for="end">Fim (segundos)</label><input id="end" type="number" min="0.2" step="0.01" value="1"><input id="trim-end" type="range" min="0.2" max="1" step="0.01" value="1" aria-label="Fim do corte"><button class="point-button" id="set-end">${icon('play')}Usar instante atual</button></div></div><input id="seek" type="range" min="0" max="1" step="0.01" value="0" aria-label="Instante da previa"><div class="trim-duration" id="range-duration" role="status"></div><button class="point-button" id="preview-cut">${icon('play')}Reproduzir trecho</button><div class="field"><label class="field-label" for="cut-quality">Qualidade do trecho</label><select id="cut-quality"><option value="3000000">Mais detalhe</option><option value="2000000">Equilibrada</option><option value="1000000">Arquivo menor</option></select></div><div class="field"><label class="field-label" for="cut-height">Altura maxima</label><select id="cut-height"><option value="1080">1080 px</option><option value="720">720 px</option><option value="480">480 px</option></select></div><p class="compatibility">Corte exato com recompressao, inclusive entre keyframes. Precisao limitada ao quadro e aos blocos de audio; a qualidade pode mudar. Imagens menores nao sao ampliadas.</p>`;
if (operation === 'clean') controls = `<p class="step-label">METADADOS DESCRITIVOS</p><p id="privacy-summary" class="metadata-empty" role="status">Nenhum video inspecionado.</p><button class="point-button" id="recommend-fields">${icon('shield-check')}Selecionar dados pessoais e dispositivo</button><label class="all-fields"><input id="all-fields" type="checkbox" disabled>Selecionar todos os campos encontrados</label><div class="metadata-list" id="fields"><p class="metadata-empty">Nenhum video inspecionado.</p></div><p class="compatibility">Sugestoes por tipo de campo; revise os valores antes de remover. MP4/MOV H.264/AAC, sem recodificacao. Rotacao, cor e parametros de reproducao permanecem. Se um campo nao escolhido mudar, a copia sera bloqueada.</p>`;
if (operation === 'audio') controls = `<div class="field"><label class="field-label" for="format">Formato de audio</label><select id="format"><option value="wav">WAV \u00b7 PCM 16-bit / 48 kHz</option><option value="m4a">M4A \u00b7 AAC</option></select></div><p class="compatibility">WAV ocupa mais espaco. AAC ja compativel e preservado no M4A; outros codecs dependem de codificador disponivel. MP3 nao esta habilitado.</p>`;
if (operation === 'thumbnail') controls = `<label class="field-label" for="timestamp">Instante (segundos)</label><input class="time-number" id="timestamp" type="number" min="0" step="0.01" value="0"><input id="seek" type="range" min="0" max="1" step="0.01" value="0" aria-label="Instante da miniatura"><button class="point-button" id="set-time">${icon('play')}Usar instante atual</button><div class="field"><label class="field-label" for="format">Formato de imagem</label><select id="format"><option value="png">PNG</option><option value="jpeg">JPEG \u00b7 qualidade 92%</option></select></div><p class="compatibility">Resolucao de exibicao e orientacao do original, sem recorte ou distorcao. O quadro corresponde ao instante escolhido dentro da precisao do video.</p>`;
$('#tool-root').innerHTML = `<div class="tool-intro"><p>${config.heading}</p><span class="local-note">${icon('hard-drive')}Sem upload</span></div><nav class="tool-tabs" aria-label="Ferramentas complementares">${Object.entries(configs).map(([slug,item]) => `<a href="../${slug}/index.html"${slug === tool ? ' aria-current="page"' : ''}>${icon(item.icon)}${{cut:'Cortar',clean:'Metadados',audio:'Audio',thumbnail:'Miniatura'}[item.operation]}</a>`).join('')}</nav><section class="editor" aria-label="Processamento local"><div class="media-column"><div class="media-toolbar"><div class="view-tabs" role="group" aria-label="Previa"><button id="view-original" aria-pressed="true">Original</button><button id="view-result" aria-pressed="false" disabled>Resultado</button></div><button class="icon-button" id="reset" title="Remover v\u00eddeo" aria-label="Remover v\u00eddeo" disabled>${icon('x')}</button></div><div class="video-stage" id="dropzone" data-loaded="false"><video id="video" controls playsinline preload="none" poster="../_portal/amostra.jpg" aria-label="Pr\u00e9via do v\u00eddeo"></video><span class="sample-label">IMAGEM DE AMOSTRA</span></div><div class="file-row">${icon('film')}<span class="file-name" id="file-name">Nenhum v\u00eddeo selecionado</span><span class="file-size" id="file-size"></span></div><div class="source-info" id="source-info"></div></div><div class="settings"><h2>${{cut:'Intervalo do trecho',clean:'Campos encontrados',audio:'Trilha de audio',thumbnail:'Quadro escolhido'}[operation]}</h2><button class="upload-button" id="choose">${icon('upload')}Selecionar v\u00eddeo</button><input id="file" type="file" accept="video/mp4,video/quicktime,video/webm,.mov" hidden><button class="sample-button" id="sample">${icon('play')}Usar v\u00eddeo de amostra</button><div id="options">${controls}</div><button class="primary" id="export" disabled>${icon(config.icon)}${config.action}</button></div></section><section class="status-area" id="status-area"><div class="status-line"><strong id="status-title">Aguardando v\u00eddeo</strong><div><span id="percent"></span><button class="cancel" id="cancel" hidden>Cancelar</button></div></div><progress id="progress" value="0" max="1"></progress><p id="status-message" role="status" aria-live="polite">Ate 32 MiB \u00b7 2 minutos \u00b7 1080p / 60 fps \u00b7 audio mono/estereo</p></section><section class="result operation-result" id="result" hidden aria-label="Resultado"><strong id="result-title"></strong><p class="result-note" id="result-note"></p><audio class="audio-preview" id="audio" controls hidden></audio><img class="thumbnail-preview" id="thumbnail" alt="Quadro capturado" hidden><div class="comparison-block" id="comparison-block" hidden><h2>Antes e depois da reinspe\u00e7\u00e3o</h2><table class="comparison-table"><thead><tr><th>Campo</th><th>Original</th><th>Copia</th></tr></thead><tbody id="comparison-body"></tbody></table></div><div class="result-actions"><a class="download" id="download">${icon('download')}Baixar c\u00f3pia</a></div></section><section class="extra-notes"><h2>Sobre esta c\u00f3pia.</h2><p>${operation === 'clean' ? 'Apenas campos descritivos acessiveis sao inspecionados. Datas tecnicas internas sao recriadas e permanecem na copia. Datas do arquivo no sistema podem mudar no download. Campos proprietarios nao lidos, informacoes visiveis, som, direitos autorais e reconhecimento do conteudo nao sao removidos. Limpeza nao garante anonimato. Trilhas extras e capitulos nao homologados sao recusados, nunca removidos silenciosamente.' : 'O original nao e substituido. Os codecs disponiveis variam entre navegadores; Chrome/Windows e o ambiente validado inicialmente. HDR para recodificacao/captura e arquivos acima dos limites nao sao homologados.'}</p></section>`;
let engine, loading, metadata, file, previewUrl, result, busy = false, generation = 0, playingCut = false;
const history = [];
const size = bytes => `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
function status(title, message, error = false) { $('#status-title').textContent = title; $('#status-message').textContent = message; $('#status-area').dataset.error = String(error); }
function selection() { return [...document.querySelectorAll('[data-field]:checked')].map(input => input.dataset.field); }
function validRange() { return metadata && $('#start').value !== '' && $('#end').value !== '' && Number($('#start').value) >= 0 && Number($('#end').value) <= metadata.duration && Number($('#end').value) - Number($('#start').value) >= .2 - 1e-8; }
function buttons() {
  let supported = !!metadata;
  if (operation === 'clean') supported &&= ['MP4','QuickTime File Format'].includes(metadata.container) && metadata.capabilities.copyMp4 && selection().length > 0;
  if (operation === 'audio') supported &&= !!metadata.audio?.decodable && ($('#format').value === 'wav' || metadata.capabilities.aacEncodable);
  if (operation === 'cut') supported &&= metadata.capabilities.transcodeMp4 && validRange();
  if (operation === 'thumbnail') supported &&= metadata.videoDecodable && !metadata.hdr && $('#timestamp').value !== '' && Number($('#timestamp').value) >= 0 && Number($('#timestamp').value) < metadata.duration;
  $('#export').disabled = busy || !supported; $('#cancel').hidden = !busy; $('#reset').disabled = !file;
  $('#options').querySelectorAll('input,select,button').forEach(control => { control.disabled = busy || !metadata; });
  if (operation === 'clean') {
    const fields = [...document.querySelectorAll('[data-field]')];
    const selected = fields.filter(input => input.checked).length;
    $('#all-fields').checked = fields.length > 0 && selected === fields.length;
    $('#all-fields').indeterminate = selected > 0 && selected < fields.length;
    $('#all-fields').disabled = busy || !metadata || fields.length === 0;
    $('#recommend-fields').disabled = busy || !metadata || !recommendedFields(metadata.fields).length;
    const count = metadata?.fields.length || 0, recommended = metadata ? recommendedFields(metadata.fields).length : 0;
    $('#privacy-summary').textContent = metadata ? `${count} campos encontrados; ${recommended} com indicios de dados pessoais ou dispositivo; ${selected} selecionados. Outros campos precisam de revisao manual.` : 'Nenhum video inspecionado.';
  }
  if (operation === 'cut' && $('#view-result').getAttribute('aria-pressed') === 'true') for (const id of ['seek','set-start','set-end']) $(`#${id}`).disabled = true;
  if (operation === 'cut') {
    $('#range-duration').textContent = validRange() ? `${(Number($('#end').value) - Number($('#start').value)).toFixed(2)} s de trecho` : metadata ? 'Escolha inicio e fim dentro do video, com pelo menos 0,2 s.' : 'Selecione um video.';
    for (const [range, number] of [['trim-start','start'],['trim-end','end']]) { $(`#${range}`).max = metadata?.duration || 1; $(`#${range}`).value = $(`#${number}`).value; }
    $('#preview-cut').disabled = busy || !validRange();
  }
}
function clearResult() {
  result = null; $('#audio').pause(); $('#audio').removeAttribute('src'); $('#audio').load(); $('#audio').hidden = true;
  $('#thumbnail').removeAttribute('src'); $('#thumbnail').hidden = true; $('#result').hidden = true; $('#comparison-block').hidden = true;
  $('#view-result').disabled = true; $('#download').removeAttribute('href'); $('#comparison-body').replaceChildren();
}
function view(output = false) {
  playingCut = false;
  const video = $('#video'); video.pause();
  const url = output && result && ['cut','clean'].includes(operation) ? engine.downloadUrl() : previewUrl;
  if (url) { video.removeAttribute('poster'); video.preload = 'auto'; video.src = url; $('#dropzone').dataset.loaded = 'true'; }
  else { video.removeAttribute('src'); video.poster = '../_portal/amostra.jpg'; $('#dropzone').dataset.loaded = 'false'; } video.load();
  $('#view-original').setAttribute('aria-pressed', String(!output)); $('#view-result').setAttribute('aria-pressed', String(output));
  buttons();
}
function releasePreview() { $('#video').pause(); $('#video').removeAttribute('src'); $('#video').load(); if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null; }
async function getEngine() {
  if (engine) return engine;
  loading ??= new Promise((resolve,reject) => { const script = document.createElement('script'); script.src = new URL('../_portal/engine/engine.js', location.href); script.onload = resolve; script.onerror = () => { loading = null; script.remove(); reject(new Error('Motor indisponivel. Use a previa HTTP local ou HTTPS.')); }; document.head.append(script); });
  await loading;
  engine ??= new HFMedia.VideoEngine({ onState(state) { history.push({ phase: state.phase, progress: state.progress, seconds: state.processedSeconds }); if (history.length > 2000) history.shift(); if (state.phase === 'processing') { status('Processando no navegador', state.stage === 'validating' ? 'Reinspecionando a saida.' : 'Seu arquivo permanece neste dispositivo.'); $('#progress').value = state.progress || 0; $('#percent').textContent = `${Math.round((state.progress || 0) * 100)}%`; } } }); return engine;
}
async function open(next) {
  playingCut = false;
  endMeasurement('cancel');
  const current = ++generation; engine?.cancel(); clearResult(); releasePreview(); metadata = null; file = next; busy = true; view(); buttons();
  $('#file-name').textContent = next.name || 'Video local'; $('#file-size').textContent = size(next.size); $('#source-info').replaceChildren();
  if (operation === 'clean') { $('#fields').replaceChildren(); $('#all-fields').checked = false; }
  status('Analisando v\u00eddeo', 'Conferindo formato, codecs, trilhas e campos encontrados.'); $('#progress').removeAttribute('value'); $('#percent').textContent = '';
  try {
    const local = await getEngine(); if (current !== generation) return;
    const data = await local.open(next); if (current !== generation) return; metadata = data; previewUrl = URL.createObjectURL(next); view();
    $('#source-info').textContent = `${data.width} x ${data.height} \u00b7 ${data.duration.toFixed(2)} s \u00b7 ${data.codec || 'codec desconhecido'} \u00b7 ${data.audio?.codec || 'sem audio'}`;
    if (operation === 'cut') { $('#start').value = '0'; $('#end').value = String(Math.floor(data.duration * 1000) / 1000); }
    if ($('#seek')) { $('#seek').max = Math.max(0, data.duration - 1 / data.frameRate); $('#seek').value = 0; }
    if (operation === 'thumbnail') { $('#timestamp').max = Math.max(0, data.duration - 1 / data.frameRate); $('#timestamp').value = 0; }
    if (operation === 'clean') {
      if (!data.fields.length) { const p = document.createElement('p'); p.className = 'metadata-empty'; p.textContent = 'Nenhum campo descritivo acessivel encontrado. Datas tecnicas internas nao fazem parte desta listagem.'; $('#fields').append(p); }
      const priority = field => metadataAdvice(field).category === 'Localizacao' ? 2 : Number(metadataAdvice(field).recommended);
      for (const field of [...data.fields].sort((a,b) => priority(b) - priority(a))) { const label = document.createElement('label'), input = document.createElement('input'), span = document.createElement('span'), strong = document.createElement('strong'), small = document.createElement('small'), category = document.createElement('small'); input.type = 'checkbox'; input.dataset.field = field.id; strong.textContent = /©too|encoder|software/i.test(field.id) ? 'Programa de criacao' : field.label; small.textContent = field.value; category.className = 'metadata-category'; category.textContent = metadataAdvice(field).category; span.append(strong,category,small); label.append(input,span); $('#fields').append(label); }
    }
    status('V\u00eddeo analisado', operation === 'audio' && !data.audio ? 'Este video nao possui audio.' : operation === 'audio' && !data.audio.decodable ? 'O navegador nao pode decodificar esta trilha de audio.' : operation === 'audio' ? `Trilha ${data.audio.codec}: ${data.audio.duration.toFixed(2)} s. O arquivo extraido comeca no inicio do audio, sem adicionar silencio para completar o video.` : operation === 'clean' && (!['MP4','QuickTime File Format'].includes(data.container) || !data.capabilities.copyMp4) ? 'Campos inspecionados. A limpeza sem recodificacao deste formato ou codec nao e suportada; nenhum dado sera removido silenciosamente.' : operation === 'clean' && !data.fields.length ? 'Nenhum campo descritivo acessivel para remover. Isso nao significa que o video seja anonimo.' : operation === 'clean' ? 'Revise os campos ou selecione a sugestao de dados pessoais. A copia sera reinspecionada.' : 'Pronto para gerar uma copia local.');
  } catch (error) { if (current === generation && error.code !== 'CANCELLED') status('Arquivo nao disponivel', error.message, true); }
  finally { if (current === generation) { busy = false; $('#progress').value = 0; buttons(); } }
}
async function run() {
  if (busy || $('#export').disabled) return;
  measurementJob = window.hfMeasurement?.start(tool);
  const current = ++generation; busy = true; clearResult(); view(); buttons(); history.length = 0;
  try {
    const options = operation === 'cut' ? { start: Number($('#start').value), end: Number($('#end').value), bitrate: Number($('#cut-quality').value), maxHeight: Number($('#cut-height').value) } : operation === 'clean' ? { selected: selection() } : operation === 'audio' ? { format: $('#format').value } : { timestamp: Number($('#timestamp').value), format: $('#format').value };
    const output = await engine.process(operation,options); if (current !== generation) return; result = output;
    const url = engine.downloadUrl(); $('#download').href = url; $('#download').download = `hf-${operation}.${output.extension}`;
    $('#result').hidden = false; $('#result-title').textContent = `${operation === 'clean' ? 'C\u00f3pia reinspecionada' : operation === 'cut' ? 'Trecho MP4 validado' : operation === 'audio' ? '\u00c1udio validado' : 'Quadro capturado'} \u00b7 ${size(output.blob.size)}`;
    $('#result-note').textContent = operation === 'cut' ? `${output.range.start.toFixed(2)} a ${output.range.end.toFixed(2)} s \u00b7 saida ${output.metadata.duration.toFixed(2)} s` : operation === 'audio' ? `${output.metadata.codec} \u00b7 ${output.metadata.duration.toFixed(2)} s \u00b7 ${output.metadata.sampleRate} Hz \u00b7 ${output.metadata.channels} canais` : operation === 'thumbnail' ? `${output.metadata.width} x ${output.metadata.height} \u00b7 solicitado ${output.metadata.requestedTime.toFixed(3)} s \u00b7 quadro ${output.metadata.frameTime.toFixed(3)} s` : output.comparison.note;
    if (operation === 'clean') {
      $('#comparison-block').hidden = false;
      for (const field of output.comparison.before) { const row = document.createElement('tr'); const after = output.comparison.after.find(next => next.id === field.id); for (const text of [field.label, field.value, after?.value || 'Removido (reinspecionado)']) { const cell = document.createElement('td'); cell.textContent = text; row.append(cell); } $('#comparison-body').append(row); }
    }
    if (operation === 'audio') { $('#audio').src = url; $('#audio').hidden = false; }
    else if (operation === 'thumbnail') { $('#thumbnail').src = url; $('#thumbnail').hidden = false; }
    else { $('#view-result').disabled = false; view(true); }
    status('Sa\u00edda validada', operation === 'clean' ? 'Campos selecionados ausentes na reinspecao. Consulte o que permanece na copia.' : 'Copia pronta para conferir e baixar.'); $('#progress').value = 1; $('#percent').textContent = '100%';
    endMeasurement('success');
  } catch (error) { if (current === generation && error.code !== 'CANCELLED') { endMeasurement('failure', error.code); clearResult(); status('Opera\u00e7\u00e3o interrompida', error.message, true); $('#progress').value = 0; $('#percent').textContent = ''; } }
  finally { if (current === generation) { busy = false; buttons(); } }
}
function cancel() { endMeasurement('cancel'); generation++; engine?.cancel(); busy = false; clearResult(); view(); status('Processamento cancelado', 'Worker interrompido; saida temporaria descartada.'); $('#progress').value = 0; $('#percent').textContent = ''; buttons(); }
function reset() { cancel(); engine?.dispose(); releasePreview(); metadata = null; file = null; $('#file').value = ''; $('#file-name').textContent = 'Nenhum v\u00eddeo selecionado'; $('#file-size').textContent = ''; $('#source-info').replaceChildren(); if (operation === 'clean') $('#fields').replaceChildren(); view(); status('Aguardando v\u00eddeo','Ate 32 MiB \u00b7 2 minutos \u00b7 1080p / 60 fps'); buttons(); }
$('#choose').addEventListener('click', () => { $('#file').value = ''; $('#file').click(); }); $('#file').addEventListener('change', event => { if (event.target.files[0]) void open(event.target.files[0]); });
$('#sample').addEventListener('click', async () => { const current = generation; $('#sample').disabled = true; try { const response = await fetch(new URL('../_portal/amostra-ferramentas.mp4',location.href)); if (!response.ok) throw new Error('Amostra nao disponivel.'); const blob = await response.blob(); if (current === generation) await open(new File([blob],'amostra-hf.mp4',{type:'video/mp4'})); } catch (error) { if (current === generation) status('Amostra indisponivel',error.message,true); } finally { $('#sample').disabled = false; } });
$('#export').addEventListener('click', () => { void run(); }); $('#cancel').addEventListener('click',cancel); $('#reset').addEventListener('click',reset);
$('#view-original').addEventListener('click', () => view()); $('#view-result').addEventListener('click', () => view(true));
$('#options').addEventListener('input',buttons);
if ($('#all-fields')) $('#all-fields').addEventListener('input', event => { document.querySelectorAll('[data-field]').forEach(input => { input.checked = event.target.checked; }); buttons(); });
if ($('#seek')) $('#seek').addEventListener('input', event => { if (metadata) { $('#video').currentTime = Number(event.target.value); if ($('#timestamp')) $('#timestamp').value = event.target.value; buttons(); } });
$('#video').addEventListener('timeupdate', () => { if ($('#seek') && !busy) $('#seek').value = $('#video').currentTime; if (playingCut && $('#video').currentTime >= Number($('#end').value)) { $('#video').pause(); playingCut = false; } });
if (operation === 'cut') {
  for (const [range, number] of [['trim-start','start'],['trim-end','end']]) $(`#${range}`).addEventListener('input', event => { playingCut = false; $(`#${number}`).value = event.target.value; buttons(); });
  $('#preview-cut').addEventListener('click', async () => { view(); $('#video').currentTime = Number($('#start').value); playingCut = true; try { await $('#video').play(); } catch { playingCut = false; status('Previa indisponivel', 'O navegador nao conseguiu reproduzir este arquivo.'); } });
}
if (operation === 'clean') $('#recommend-fields').addEventListener('click', () => { const recommended = recommendedFields(metadata.fields); document.querySelectorAll('[data-field]').forEach(input => { input.checked = recommended.includes(input.dataset.field); }); buttons(); });
if (operation === 'audio') $('#format').addEventListener('change', () => { if (metadata?.audio) status('Formato escolhido', $('#format').value === 'm4a' && !metadata.capabilities.aacEncodable ? 'AAC indisponivel neste navegador. Escolha WAV.' : $('#format').value === 'm4a' && metadata.audio.codec === 'aac' ? 'A trilha AAC sera preservada sem recompressao.' : 'A trilha sera recodificada para o formato escolhido.'); });
if ($('#timestamp')) $('#timestamp').addEventListener('change', () => { if (metadata) $('#video').currentTime = Math.min(metadata.duration,Math.max(0, Number($('#timestamp').value))); });
for (const [id,target] of [['set-start','start'],['set-end','end'],['set-time','timestamp']]) if ($(`#${id}`)) $(`#${id}`).addEventListener('click', () => { $(`#${target}`).value = $('#video').currentTime.toFixed(3); buttons(); });
$('#dropzone').addEventListener('dragover',event => { event.preventDefault(); $('#dropzone').classList.add('drop-active'); }); $('#dropzone').addEventListener('dragleave', () => $('#dropzone').classList.remove('drop-active')); $('#dropzone').addEventListener('drop',event => { event.preventDefault(); $('#dropzone').classList.remove('drop-active'); if (event.dataTransfer.files[0]) void open(event.dataTransfer.files[0]); });
window.addEventListener('pagehide', () => { generation++; engine?.dispose(); releasePreview(); });
window.hfExtra = { open, run, cancel, reset, history, get engine(){return engine;}, get metadata(){return metadata;}, get result(){return result;}, get busy(){return busy;} };
buttons();
