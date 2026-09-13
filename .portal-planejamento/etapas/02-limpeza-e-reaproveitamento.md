# Etapa 02: Limpeza e reaproveitamento das paginas

Status real: estado.json. Dependencia: etapa 1 concluida. Paginas contabilizadas: 0.
As bases criadas aqui contam como concluidas somente nas etapas 3, 5, 6 e 8.

## Objetivo

Retirar todo o conteudo de vendas autorizado pelo usuario e preparar as paginas para
as sete ferramentas de video, mantendo uma copia recuperavel dos arquivos anteriores.
Esta revisao substitui a antiga exigencia de preservar o funil em funcionamento.

## Entregas

- Onze HTMLs antigos limpos: home, pagina de exemplos, privacidade e oito paginas do funil.
- Home de navegacao e sete bases de ferramenta, incluindo metadados exclusivamente de VIDEO.
- Enderecos antigos reaproveitados como aliases locais; nenhuma venda, formulario ou tag antiga.
- Mapa atualizado para 27 destinos unicos; dez etapas mantidas.
- Snapshot anterior, comprovacao automatica e navegacao conferida no navegador.

## Regras

- Nao publicar durante esta etapa; o dominio sera atualizado na etapa 10.
- Remover textos/ofertas, formulários de leads, audio automatico, checkout, upsell, tags e endpoints antigos dos HTMLs.
- Nao enviar dados a contas externas e nao propagar parametros de leads em aliases.
- Bases de ferramentas devem mostrar estado de preparacao, sem botoes que simulem processamento.
- Manter layout estrutural simples; a identidade visual completa pertence a etapa 3.
- Arquivos de midia/PDF antigos ficam sem vinculo; backup e historico permanecem recuperaveis.

## Criterios de conclusao

- **snapshot-conferido**: Snapshot anterior a limpeza com hashes de paginas e planejamento conferidos.
- **paginas-reaproveitadas**: Onze HTMLs antigos substituidos; sete destinos de ferramenta e aliases funcionam.
- **integracoes-removidas**: HTMLs ativos sem formularios, checkout, rastreamento, endpoints ou conteudo de venda antigo.
- **mapa-atualizado**: 27 rotas, sete ferramentas e dez etapas coerentes nos documentos, regras e testes.
- **navegacao-local**: Conferir catalogo, aliases, metadados de video e estrutura em desktop/mobile pelo navegador.

## Bloqueios e evidencias

Alias quebrado, conteudo antigo presente, rastreador ativo ou ferramenta apresentada como
funcional antes da implementacao impedem concluir. Salvar relatorio, capturas e hashes.
Consultar o modelo: `node .portal-planejamento/scripts/verificar.mjs modelo 2`.
