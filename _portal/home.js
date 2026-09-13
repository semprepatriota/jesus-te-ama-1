(() => {
  'use strict';
  const tools = {
    'comprimir-video': ['Um arquivo mais leve.', 'Equil\u00edbrio entre tamanho, resolu\u00e7\u00e3o e qualidade para o seu destino.', 'minimize-2'],
    'video-para-whatsapp': ['Seu v\u00eddeo na conversa.', 'Uma escolha de tamanho e qualidade pensada para compartilhar por mensagem.', 'message-circle'],
    'converter-para-mp4': ['Um formato para mais destinos.', 'Convers\u00e3o para MP4, conforme o formato e o codec suportados.', 'film'],
    'cortar-video': ['Fique com o melhor trecho.', 'Defina o in\u00edcio e o fim para guardar a parte que importa.', 'scissors'],
    'limpar-metadados-video': ['Escolha os dados que ficam.', 'Inspecione os campos pessoais suportados, escolha o que remover e confira a c\u00f3pia.', 'shield-check'],
    'extrair-audio': ['D\u00ea espa\u00e7o ao som.', 'Separe a trilha de \u00e1udio do seu v\u00eddeo em um novo arquivo.', 'audio-lines'],
    'capturar-miniatura': ['Uma imagem dentro do v\u00eddeo.', 'Escolha o quadro para sua miniatura, capa ou refer\u00eancia.', 'image'],
  };
  const get = id => document.getElementById(id);
  const selectedTool = get('selected-tool');
  function updateSelectedTool() {
    const item = tools[selectedTool.value];
    if (!item) return;
    get('selected-title').textContent = item[0];
    get('selected-description').textContent = item[1];
    get('selected-icon').src = `_portal/icons/${item[2]}.svg`;
    get('tool-link').href = `${selectedTool.value}/index.html`;
    const metadataSelected = selectedTool.value === 'limpar-metadados-video';
    document.querySelector('.tool-picker').classList.toggle('metadata-selected', metadataSelected);
    get('picker-eyebrow').textContent = metadataSelected ? 'EM DESTAQUE \u00b7 PRIVACIDADE' : 'O QUE SEU V\u00cdDEO PRECISA?';
    get('picker-heading').textContent = metadataSelected ? 'Limpar metadados de v\u00eddeo.' : 'Escolha o pr\u00f3ximo passo.';
    get('tool-action-label').textContent = metadataSelected ? 'Inspecionar meu v\u00eddeo' : 'Ver ferramenta';
    get('tool-availability').lastChild.textContent = 'Dispon\u00edvel para teste local';
  }
  selectedTool.addEventListener('change', updateSelectedTool);
  window.addEventListener('pageshow', updateSelectedTool);
  updateSelectedTool();
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const search = get('tool-search');
  const cards = [...document.querySelectorAll('.tool-card')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  let category = 'all';
  function filterCards() {
    const query = normalize(search.value.trim());
    let visible = 0;
    for (const card of cards) {
      const matchesCategory = category === 'all' || card.dataset.category === category;
      const matchesText = query.split(/\s+/).every(word => normalize(card.dataset.search + ' ' + card.textContent).includes(word));
      card.hidden = !(matchesCategory && matchesText);
      if (!card.hidden) visible++;
    }
    document.querySelector('.catalog-note').hidden = query !== '' || category !== 'all';
    get('empty-results').hidden = visible !== 0;
    get('clear-search').hidden = search.value === '';
    get('search-status').textContent = `${visible} ferramenta${visible === 1 ? '' : 's'} encontrada${visible === 1 ? '' : 's'}.`;
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
  }
  search.addEventListener('input', filterCards);
  filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; filterCards(); }));
  get('clear-search').addEventListener('click', () => { search.value = ''; filterCards(); search.focus(); });
  get('reset-search').addEventListener('click', () => { search.value = ''; category = 'all'; filterCards(); search.focus(); });

  const video = get('preview-video');
  const seek = get('seek');
  const playButton = get('play-button');
  const bigPlay = get('big-play');
  const muteButton = get('mute-button');
  const input = get('video-file');
  const resetButton = get('reset-video');
  const status = get('video-status');
  let objectUrl = null;
  let currentFile = null;
  function time(value) {
    const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    return `${hours ? String(hours).padStart(2, '0') + ':' : ''}${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function setIcon(button, name, label) {
    button.querySelector('img').src = `_portal/icons/${name}.svg`;
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  function updatePlayback() {
    setIcon(playButton, video.paused ? 'play' : 'pause', video.paused ? 'Reproduzir v\u00eddeo' : 'Pausar v\u00eddeo');
    bigPlay.hidden = !video.paused || video.readyState < 2;
  }
  function updateTime() {
    get('current-time').textContent = time(video.currentTime);
    get('duration').textContent = time(video.duration);
    seek.max = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    seek.value = video.currentTime || 0;
    seek.setAttribute('aria-valuetext', `${time(video.currentTime)} de ${time(video.duration)}`);
  }
  async function togglePlayback() {
    if (!video.paused) { video.pause(); return; }
    try { await video.play(); } catch { status.textContent = 'N\u00e3o foi poss\u00edvel reproduzir este v\u00eddeo no navegador.'; }
  }
  playButton.addEventListener('click', togglePlayback);
  bigPlay.addEventListener('click', togglePlayback);
  video.addEventListener('play', updatePlayback);
  video.addEventListener('pause', updatePlayback);
  video.addEventListener('ended', updatePlayback);
  video.addEventListener('timeupdate', updateTime);
  video.addEventListener('canplay', updatePlayback);
  video.addEventListener('loadedmetadata', () => {
    updateTime();
    if (currentFile) {
      get('file-label').textContent = currentFile.name;
      get('source-label').textContent = `${video.videoWidth} \u00d7 ${video.videoHeight}`;
      status.textContent = 'Pr\u00e9via local. Este arquivo n\u00e3o foi enviado.';
    }
  });
  seek.addEventListener('input', () => {
    if (Number.isFinite(video.duration)) video.currentTime = Math.min(video.duration, Number(seek.value));
    updateTime();
  });
  muteButton.addEventListener('click', () => {
    video.muted = !video.muted;
    setIcon(muteButton, video.muted ? 'volume-x' : 'volume-2', video.muted ? 'Ativar som' : 'Silenciar');
  });
  get('fullscreen-button').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (get('video-stage').requestFullscreen) await get('video-stage').requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      else status.textContent = 'Tela cheia indispon\u00edvel neste navegador.';
    } catch { status.textContent = 'N\u00e3o foi poss\u00edvel abrir a tela cheia.'; }
  });
  document.addEventListener('fullscreenchange', () => {
    video.controls = Boolean(document.fullscreenElement);
  });
  function detachFile() {
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    currentFile = null;
  }
  function resetSample() {
    detachFile();
    video.poster = '_portal/amostra.jpg';
    video.src = '_portal/amostra.mp4';
    video.setAttribute('aria-label', 'V\u00eddeo de amostra: flores ao vento');
    get('file-label').textContent = 'Flores ao vento \u00b7 MP4';
    get('source-label').textContent = 'Amostra';
    resetButton.hidden = true;
    input.value = '';
    status.textContent = '';
    updateTime();
    updatePlayback();
  }
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    if (file.size === 0 || (!file.type.startsWith('video/') && !/\.(mp4|mov|webm)$/i.test(file.name))) {
      status.textContent = 'Escolha um arquivo de v\u00eddeo v\u00e1lido e n\u00e3o vazio.';
      return;
    }
    detachFile();
    currentFile = file;
    objectUrl = URL.createObjectURL(file);
    video.removeAttribute('poster');
    video.src = objectUrl;
    video.setAttribute('aria-label', 'Pr\u00e9via do v\u00eddeo escolhido');
    get('file-label').textContent = file.name;
    get('source-label').textContent = 'Arquivo local';
    resetButton.hidden = false;
    status.textContent = 'Abrindo pr\u00e9via local...';
    updateTime();
    updatePlayback();
  });
  resetButton.addEventListener('click', resetSample);
  video.addEventListener('error', () => {
    if (!video.getAttribute('src')) return;
    status.textContent = currentFile ? 'Este formato ou codec n\u00e3o reproduz neste navegador. Escolha outro v\u00eddeo ou volte \u00e0 amostra.' : 'A amostra de v\u00eddeo n\u00e3o p\u00f4de ser carregada.';
    bigPlay.hidden = true;
  });
  window.addEventListener('pagehide', event => { if (objectUrl && !event.persisted) URL.revokeObjectURL(objectUrl); });
  video.controls = false;
  document.querySelectorAll('.js-control').forEach(control => { control.hidden = false; });
  updatePlayback();
  updateTime();
})();
