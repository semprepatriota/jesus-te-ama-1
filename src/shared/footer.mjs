export const trustLinks = [
  ['sobre', 'Sobre'], ['contato', 'Contato'], ['privacidade', 'Privacidade'],
  ['termos', 'Termos de uso'], ['cookies', 'Cookies'],
  ['direitos-autorais', 'Direitos autorais'], ['seguranca-e-processamento-local', 'Processamento local']
];
export function publicFooter(base) {
  return `<footer class="public-footer"><div class="public-footer-inner"><a class="brand" href="${base}index.html"><span class="brand-mark small">hf<span>.</span></span><span class="brand-name">Ferramentas</span></a><nav aria-label="Informacoes do site">${trustLinks.map(([slug, label]) => `<a href="${base}${slug}/index.html">${label}</a>`).join('')}</nav><p>Respons&aacute;vel: ${escape(publicConfig.responsibleName)} <span aria-hidden="true">&middot;</span> <a href="${base}contato/index.html">Atendimento</a></p></div></footer>`;
}
import { publicConfig } from '../trust/public-config.mjs';
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
