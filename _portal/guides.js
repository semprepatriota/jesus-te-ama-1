(() => {
  const input = document.querySelector('#guide-search');
  const clear = document.querySelector('#guide-clear');
  const buttons = [...document.querySelectorAll('.guide-filters button')];
  const items = [...document.querySelectorAll('.guide-item')];
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const texts = items.map(item => normalize(item.textContent));
  let category = 'all';
  const render = () => {
    const query = normalize(input.value.trim()); let count = 0;
    items.forEach((item, index) => { item.hidden = !(category === 'all' || item.dataset.category === category) || !texts[index].includes(query); if (!item.hidden) count++; });
    clear.hidden = !input.value;
    document.querySelector('#guide-count').textContent = `${count} ${count === 1 ? 'guia' : 'guias'}`;
    document.querySelector('#guide-empty').hidden = count > 0;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
  };
  input.addEventListener('input', render);
  buttons.forEach(button => button.addEventListener('click', () => { category = button.dataset.category; render(); }));
  clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  document.querySelector('#guide-reset').addEventListener('click', () => { category = 'all'; input.value = ''; render(); input.focus(); });
  document.querySelector('.guide-search').hidden = false;
  document.querySelector('.guide-filters').hidden = false;
  render();
})();
