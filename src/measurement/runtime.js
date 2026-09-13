import { createMeasurement } from './controller.js';
import { measurementConfig } from './config.js';
export { createMeasurement, failureCategory } from './controller.js';

export function installPreferences(controller, { document: doc = document, onGrant = () => {} } = {}) {
  if (!controller.enabled) return null;
  const dialog = doc.createElement('dialog');
  dialog.className = 'measurement-preferences';
  dialog.setAttribute('aria-labelledby', 'measurement-title');
  dialog.innerHTML = '<h2 id="measurement-title">Preferências de privacidade</h2><p>Permitir estatísticas opcionais de uso das ferramentas?</p><p>Vídeos e informações dos arquivos não fazem parte desses eventos. Sua escolha vale nesta aba.</p><div class="preference-actions"><button type="button" data-choice="denied">Recusar</button><button type="button" data-choice="granted">Aceitar estatísticas</button></div>';
  const change = doc.createElement('button');
  change.type = 'button'; change.className = 'privacy-preference-button'; change.textContent = 'Preferências de privacidade';
  change.addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('click', event => { const choice = event.target.closest('[data-choice]')?.dataset.choice; if (!choice) return; controller.setPreference(choice); dialog.close(); if (controller.preference === 'granted') onGrant(); });
  dialog.addEventListener('cancel', () => controller.setPreference('denied'));
  doc.body.append(dialog);
  (doc.querySelector('.public-footer-inner') ?? doc.body).append(change);
  dialog.showModal();
  return Object.freeze({ dialog, change, dispose() { dialog.remove(); change.remove(); controller.dispose(); } });
}

// No provider or network transport is installed in this release.
if (typeof window !== 'undefined' && !window.hfMeasurement) {
  const controller = createMeasurement({ enabled: measurementConfig.enabled });
  window.hfMeasurement = controller;
  const tool = document.body.dataset.tool;
  installPreferences(controller, { onGrant: () => controller.open(tool) });
  controller.open(tool);
  window.addEventListener('pagehide', () => controller.dispose());
}
