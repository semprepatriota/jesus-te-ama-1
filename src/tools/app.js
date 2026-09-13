import { compressionOptions, comparison } from "./presets.js";
import { failureCategory } from "../measurement/controller.js";
let measurementJob = null;
function endMeasurement(outcome, code) {
  window.hfMeasurement?.finish(measurementJob, outcome, failureCategory(code)), measurementJob = null;
}
const tool = document.body.dataset.tool, $ = (selector) => document.querySelector(selector), icon = (name, size2 = 18) => `<img src="../_portal/icons/${name}.svg" alt="" width="${size2}" height="${size2}">`, config = {
  "comprimir-video": { subtitle: "Uma c\xF3pia mais leve, sem abrir m\xE3o do original.", heading: "Tamanho & qualidade", action: "Comprimir v\xEDdeo" }
}[tool], resolutions = (whatsapp = !1) => `<div class="field"><label class="field-label" for="height">Altura m\xE1xima</label><select id="height"><option value="720">720 px</option><option value="480">480 px</option>${whatsapp ? "" : '<option value="1080">1080 px</option>'}</select></div>`;
let controls;
controls = `<fieldset><legend>Qualidade da c\xF3pia</legend><div class="segments"><label><input type="radio" name="quality" value="small"><span>Mais leve</span></label><label><input type="radio" name="quality" value="balanced" checked><span>Equilibrada</span></label><label><input type="radio" name="quality" value="high"><span>Mais detalhe</span></label></div></fieldset>${resolutions()}<p class="compatibility">A recompress\xE3o pode perder detalhes. O tamanho final depende do conte\xFAdo; nem todo v\xEDdeo fica menor.</p>`;
$("#tool-root").innerHTML = `<div class="tool-intro"><p>${config.subtitle}</p><span class="local-note">${icon("shield-check")}Sem upload</span></div><nav class="tool-tabs" aria-label="Ferramentas iniciais">${[["comprimir-video", "Comprimir", "minimize-2"], ["limpar-metadados-video", "Metadados", "shield-check"], ["cortar-video", "Cortar", "scissors"], ["extrair-audio", "Audio", "audio-lines"], ["capturar-miniatura", "Miniatura", "image"]].map(([slug, label, image]) => `<a href="../${slug}/index.html"${tool === slug ? ' aria-current="page"' : ""}>${icon(image, 17)}${label}</a>`).join("")}</nav><section class="editor" aria-label="Processamento local"><div class="media-column"><div class="media-toolbar"><div class="view-tabs" role="group" aria-label="Pr\xE9via"><button id="view-original" aria-pressed="true">Original</button><button id="view-result" aria-pressed="false" disabled>Resultado</button></div><button class="icon-button" id="reset" title="Remover v\xEDdeo" aria-label="Remover v\xEDdeo" disabled>${icon("x")}</button></div><div class="video-stage" id="dropzone" data-loaded="false"><video id="video" playsinline controls preload="none" poster="../_portal/amostra.jpg" aria-label="Pr\xE9via do v\xEDdeo"></video><span class="sample-label">IMAGEM DE AMOSTRA</span></div><div class="file-row">${icon("film", 16)}<span class="file-name" id="file-name">Nenhum v\xEDdeo selecionado</span><span class="file-size" id="file-size"></span></div><div id="source-info" class="source-info"></div></div><div class="settings"><h2>${config.heading}</h2><button class="upload-button" id="choose">${icon("upload")}Selecionar v\xEDdeo</button><input id="file" type="file" accept="video/mp4,video/webm,video/quicktime,.mov" hidden><div id="options">${controls}</div><div class="output-format">${icon("film", 16)}<span>MP4 \xB7 H.264 / AAC</span></div><button class="primary" id="export" disabled>${icon("arrow-right")}${config.action}</button></div></section><section class="status-area" id="status-area"><div class="status-line"><strong id="status-title">Aguardando v\xEDdeo</strong><div><span id="percent"></span><button class="cancel" id="cancel" hidden>Cancelar</button></div></div><progress id="progress" value="0" max="1"></progress><p id="status-message" role="status" aria-live="polite">MP4, MOV ou WebM \xB7 at\xE9 32 MiB \xB7 2 minutos \xB7 1080p / 60 fps \xB7 \xE1udio mono ou est\xE9reo</p></section><section class="result" id="result" aria-label="Resultado da exporta\xE7\xE3o" hidden><div><div class="result-stats"><div><span>ORIGINAL</span><strong id="original-size"></strong></div><div><span>RESULTADO</span><strong id="result-size"></strong></div><div><span id="comparison-label">DIFEREN\xC7A</span><strong id="comparison"></strong></div></div><p class="result-note" id="result-note"></p></div><div class="result-actions"><a class="download" id="download" download="video-hf.mp4">${icon("download")}Baixar MP4</a><button class="share" id="share" hidden>Compartilhar arquivo</button></div></section><section class="domain-notes"><div><h2>Sobre esta c\xF3pia.</h2><p>O original n\xE3o \xE9 substitu\xEDdo. Formato, resolu\xE7\xE3o e qualidade s\xE3o escolhas diferentes.</p></div><div><details><summary>O v\xEDdeo pode ficar maior?</summary><p>Sim. Um original j\xE1 muito comprimido pode ficar maior ao ser recodificado. Compare os tamanhos reais e preserve o original.</p></details><details><summary>Trocar a extens\xE3o converte o arquivo?</summary><p>N\xE3o. MP4 \xE9 um cont\xEAiner; o conte\xFAdo precisa ser reempacotado ou convertido com codecs compat\xEDveis.</p></details><details><summary>Quais arquivos ainda n\xE3o est\xE3o homologados?</summary><p>Arquivos acima dos limites indicados, HDR para recompress\xE3o, legendas, v\xE1rias trilhas e \xE1udio multicanal. A disponibilidade de codecs varia entre navegadores. Celulares f\xEDsicos ainda precisam de valida\xE7\xE3o.</p></details></div></section>`;
$(".output-format span").textContent = "MP4 \xB7 H.264 / AAC quando h\xE1 \xE1udio";
let engine, engineLoading, metadata, selectedFile, previewUrl, output, busy = !1, generation = 0, attempt = 0;
const history = [];
function size(bytes) {
  return `${(bytes / 1024 ** 2).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} MiB`;
}
function status(title, message, error = !1) {
  $("#status-title").textContent = title, $("#status-message").textContent = message, $("#status-area").dataset.error = String(error);
}
function renderButtons() {
  const compatible = metadata && ("transcode" === "copy" ? metadata.capabilities.copyMp4 && metadata.videoDecodable && (!metadata.audio || metadata.audio.decodable) : metadata.capabilities.transcodeMp4);
  $("#export").disabled = busy || !compatible, $("#cancel").hidden = !busy, $("#reset").disabled = !selectedFile, $("#options").querySelectorAll("input,select").forEach((control) => {
    control.disabled = busy || !metadata;
  });
}
function clearResult() {
  output = null, $("#result").hidden = !0, $("#view-result").disabled = !0, $("#download").removeAttribute("href"), $("#share").hidden = !0;
}
function showView(result = !1) {
  const video = $("#video");
  video.pause();
  const url = result && output ? engine.downloadUrl() : previewUrl;
  url ? (video.removeAttribute("poster"), video.src = url, $("#dropzone").dataset.loaded = "true") : (video.removeAttribute("src"), video.poster = "../_portal/amostra.jpg", $("#dropzone").dataset.loaded = "false"), video.load(), $("#view-original").setAttribute("aria-pressed", String(!result)), $("#view-result").setAttribute("aria-pressed", String(result));
}
function releasePreview() {
  $("#video").pause(), $("#video").removeAttribute("src"), $("#video").load(), previewUrl && URL.revokeObjectURL(previewUrl), previewUrl = null;
}
async function getEngine() {
  return engine || (engineLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL("../_portal/engine/engine.js", location.href), script.onload = () => resolve(), script.onerror = () => {
      script.remove(), engineLoading = null, reject(new Error("N\xE3o foi poss\xEDvel carregar o motor local."));
    }, document.head.append(script);
  }), await engineLoading, engine ??= new HFMedia.VideoEngine({ onState(state) {
    history.push({ phase: state.phase, stage: state.stage, progress: state.progress, processedSeconds: state.processedSeconds, attempt }), history.length > 2e3 && history.shift(), state.phase === "processing" && (status("Processando no navegador", state.stage === "validating" ? "Conferindo dimens\xF5es, dura\xE7\xE3o e decodifica\xE7\xE3o." : "Seu arquivo permanece neste dispositivo."), $("#progress").value = state.progress || 0, $("#percent").textContent = `${Math.round((state.progress || 0) * 100)}%`);
  } }), engine);
}
async function open(file) {
  endMeasurement("cancel");
  const current = ++generation;
  engine?.cancel(), clearResult(), releasePreview(), metadata = null, selectedFile = file, busy = !0, attempt = 0, $("#file-name").textContent = file.name || "V\xEDdeo local", $("#file-size").textContent = size(file.size), $("#source-info").replaceChildren(), showView(), renderButtons(), status("Analisando v\xEDdeo", "Verificando formato e codecs reais. Nenhum upload."), $("#progress").removeAttribute("value"), $("#percent").textContent = "";
  try {
    const local = await getEngine();
    if (current !== generation) return;
    const result = await local.open(file);
    if (current !== generation) return;
    metadata = result, previewUrl = URL.createObjectURL(file), showView();
    const items = [`${result.width} \xD7 ${result.height}`, `${result.duration.toFixed(2)} s`, `${result.codec === "avc" ? "H.264" : result.codec || "Codec desconhecido"}`, result.audio ? `${(result.audio.codec || "desconhecido").toUpperCase()} \xB7 ${result.audio.channels} canais` : "Sem \xE1udio"];
    $("#source-info").replaceChildren(...items.map((text) => {
      const span = document.createElement("span");
      return span.textContent = text, span;
    })), status("V\xEDdeo analisado", result.capabilities.transcodeMp4 ? "Pronto para gerar uma c\xF3pia MP4." : "Convers\xE3o indispon\xEDvel neste navegador para este arquivo.");
  } catch (error) {
    current === generation && error.code !== "CANCELLED" && status("Arquivo n\xE3o dispon\xEDvel", error.message, !0);
  } finally {
    current === generation && (busy = !1, $("#progress").value = 0, renderButtons());
  }
}
async function run() {
  if (busy || !metadata) return;
  measurementJob = window.hfMeasurement?.start(tool);
  const current = ++generation;
  busy = !0, clearResult(), showView(), renderButtons(), history.length = 0;
  const height = Number($("#height").value);
  let options, targetBytes, result;
  try {
    if (attempt = 1, options = compressionOptions($('[name="quality"]:checked').value, height), result = await engine.exportMp4(options), current !== generation) return;
    output = { ...result, comparison: comparison(selectedFile.size, result.blob.size, targetBytes), attempts: attempt, options }, $("#original-size").textContent = size(selectedFile.size), $("#result-size").textContent = size(result.blob.size), $("#comparison-label").textContent = "DIFEREN\xC7A";
    const comp = output.comparison;
    $("#comparison").textContent = comp.reduced ? `${comp.percent.toFixed(1)}% menor` : comp.percent === 0 ? "Mesmo tamanho" : `${Math.abs(comp.percent).toFixed(1)}% maior`, $("#comparison").className = comp.reduced ? "positive" : "warning";
    const dimensions = `${result.metadata.width} \xD7 ${result.metadata.height}`;
    $("#result-note").textContent = `${dimensions} \xB7 ${result.metadata.duration.toFixed(2)} s \xB7 H.264${result.metadata.audio ? " / AAC" : " \xB7 sem \xE1udio"}. ${comp.reduced ? result.mode === "copy" ? "Reempacotado, sem recompress\xE3o das trilhas." : "C\xF3pia menor; confira os detalhes da imagem e guarde o original." : "N\xE3o houve redu\xE7\xE3o de tamanho. Guarde o original ou escolha uma qualidade menor."}`, $("#result").hidden = !1, $("#view-result").disabled = !1, $("#download").href = engine.downloadUrl(), $("#download").download = "video-comprimido-hf.mp4";
    const sharedFile = new File([result.blob], $("#download").download, { type: "video/mp4" });
    try {
      $("#share").hidden = !0;
    } catch {
      $("#share").hidden = !0;
    }
    status("MP4 validado", "Sa\xEDda conferida localmente. Compare a pr\xE9via antes de baixar."), $("#progress").value = 1, $("#percent").textContent = "100%", showView(!0), endMeasurement("success");
  } catch (error) {
    current === generation && error.code !== "CANCELLED" && (endMeasurement("failure", error.code), clearResult(), status("Exporta\xE7\xE3o interrompida", error.message, !0), $("#percent").textContent = "", $("#progress").value = 0);
  } finally {
    current === generation && (busy = !1, renderButtons());
  }
}
function cancel() {
  endMeasurement("cancel"), generation++, busy = !1, engine?.cancel(), clearResult(), showView(), status("Processamento cancelado", "O worker foi interrompido e a sa\xEDda tempor\xE1ria foi descartada."), $("#progress").value = 0, $("#percent").textContent = "", renderButtons();
}
function reset() {
  cancel(), engine?.dispose(), releasePreview(), metadata = null, selectedFile = null, $("#file").value = "", $("#file-name").textContent = "Nenhum v\xEDdeo selecionado", $("#file-size").textContent = "", $("#source-info").replaceChildren(), showView(), status("Aguardando v\xEDdeo", "MP4, MOV ou WebM \xB7 at\xE9 32 MiB \xB7 2 minutos \xB7 1080p / 60 fps \xB7 \xE1udio mono ou est\xE9reo"), renderButtons();
}
$("#choose").addEventListener("click", () => {
  $("#file").value = "", $("#file").click();
});
$("#file").addEventListener("change", (event) => {
  event.target.files[0] && open(event.target.files[0]);
});
$("#export").addEventListener("click", () => {
  run();
});
$("#cancel").addEventListener("click", cancel);
$("#reset").addEventListener("click", reset);
$("#view-original").addEventListener("click", () => showView());
$("#view-result").addEventListener("click", () => showView(!0));
$("#options").addEventListener("change", renderButtons);
$("#share").addEventListener("click", async () => {
  if (!output || busy) return;
  const current = generation;
  try {
    await navigator.share({ files: [new File([output.blob], $("#download").download, { type: "video/mp4" })] });
  } catch (error) {
    current === generation && error.name !== "AbortError" && status("Compartilhamento n\xE3o conclu\xEDdo", "O navegador n\xE3o concluiu o compartilhamento. O download MP4 continua dispon\xEDvel.");
  }
});
$("#video").addEventListener("error", () => {
  selectedFile && !busy && status("Pr\xE9via indispon\xEDvel", "O player deste navegador n\xE3o conseguiu reproduzir o arquivo. Confira o suporte de codecs antes de exportar.", !0);
});
$("#dropzone").addEventListener("dragover", (event) => {
  event.preventDefault(), $("#dropzone").classList.add("drop-active");
});
$("#dropzone").addEventListener("dragleave", () => $("#dropzone").classList.remove("drop-active"));
$("#dropzone").addEventListener("drop", (event) => {
  event.preventDefault(), $("#dropzone").classList.remove("drop-active"), event.dataTransfer.files[0] && open(event.dataTransfer.files[0]);
});
window.addEventListener("pagehide", () => {
  generation++, engine?.dispose(), releasePreview();
});
window.hfTool = { open, cancel, reset, run, history, get engine() {
  return engine;
}, get output() {
  return output;
}, get metadata() {
  return metadata;
}, get busy() {
  return busy;
} };
renderButtons();
