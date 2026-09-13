import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { trustPages } from '../src/trust/content.mjs';
import { publicConfig } from '../src/trust/public-config.mjs';
import { trustLinks, publicFooter } from '../src/shared/footer.mjs';
const { routes } = JSON.parse(fs.readFileSync('.portal-planejamento/rotas.json', 'utf8'));
test('sete paginas de confianca correspondem ao inventario', () => {
  assert.equal(trustPages.length, 7);
  assert.deepEqual(trustPages.map(page => `/${page.slug}/`).sort(), routes.filter(route => route.group === 'trust').map(route => route.url).sort());
  for (const page of trustPages) {
    assert.ok(page.sections.length >= 3);
    assert.equal(new Set(page.sections.map(section => section.id)).size, page.sections.length);
    const html = fs.readFileSync(`${page.slug}/index.html`, 'utf8');
    assert.ok(html.includes('portal-stage" content="8"'));
    assert.ok(html.includes('noindex, nofollow'));
    assert.ok(html.includes('revis&otilde;es finais ainda pendentes'));
  }
});
test('identidade e contato possuem aprovacao explicita sem dado de login', () => {
  assert.equal(publicConfig.responsibleName, 'HF NEW DIGITAL');
  assert.equal(publicConfig.email, 'contato@hfnew.com.br');
  assert.equal(publicConfig.emailPubliclyAuthorized, true);
  assert.equal(publicConfig.responsibleNamePubliclyAuthorized, true);
  assert.equal(publicConfig.mailboxConfirmedByUser, true);
  assert.equal(publicConfig.mailboxIndependentDeliveryTest, false);
  const html = fs.readFileSync('contato/index.html', 'utf8');
  assert.ok(html.includes(`mailto:${publicConfig.email}?subject=Contato%20HF%20Ferramentas`));
  assert.ok(!/<form\b|hfnew1234@gmail|GTM-TPRFFVTM/i.test(html));
});
test('rodape inclui sete rotas em todas as 26 paginas preparadas', () => {
  assert.equal(trustLinks.length, 7);
  for (const route of routes.filter(route => route.group !== 'error')) {
    const html = fs.readFileSync(route.file, 'utf8');
    const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/g);
    assert.equal(footer.length, 1);
    const base = '../'.repeat(route.file.split('/').length - 1);
    assert.equal(footer[0], publicFooter(base));
    assert.ok(html.includes(`${base}_portal/footer.css`));
  }
});
test('avisos nao ocultam rede, mensagem externa ou limites de metadados', () => {
  const text = trustPages.map(page => JSON.stringify(page)).join('\n');
  for (const word of ['localStorage', 'IndexedDB', 'mem&oacute;ria', 'Datas t&eacute;cnicas', 'provedor', 'legisla&ccedil;&atilde;o', '48 MiB', '180 segundos']) assert.ok(text.includes(word));
  assert.ok(!/100% seguro|totalmente an[o&]nimo|sem perda garantida/i.test(text));
});

test('prazo aprovado de atendimento e manual e nao promete exclusao dos provedores', () => {
  assert.equal(publicConfig.supportOperationApprovedByUser, true);
  assert.equal(publicConfig.supportAccess, 'responsible-only');
  assert.equal(publicConfig.supportRetentionDaysAfterResolution, 30);
  assert.equal(publicConfig.supportDeletionMethod, 'manual');
  const privacy = JSON.stringify(trustPages.find(page => page.slug === 'privacidade'));
  assert.ok(privacy.includes('30 dias'));
  assert.ok(privacy.includes('manualmente'));
  assert.ok(privacy.includes('backups'));
  assert.ok(privacy.includes('N&atilde;o &eacute; uma promessa'));
});
