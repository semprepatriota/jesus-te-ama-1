# Etapa 10: Erro 404, validacao final e publicacao

Status real: estado.json. Dependencia: etapa 9 concluida. Paginas contabilizadas: 1.

## Objetivo

Concluir a pagina 404, testar a experiencia inteira e publicar uma versao recuperavel.

## Entregas

- 404 util e sem anuncios; pacote publico das 27 rotas.
- Relatorios finais, capturas desktop/mobile e exportacoes de testes.
- Publicacao HTTPS conferida no dominio e referencia para restaurar a versao anterior.

## Regras

- Revisao adicional autorizada em 13/09/2026: indexacao seletiva da home e sete ferramentas, com opcao manual index_tools, autorizacao especifica e pacote/commit conferidos. Isso nao homologa guias/politicas/celulares nem conclui etapas pendentes; gate assinado da producao final permanece intacto. Guias, confianca, aliases e 404 continuam noindex, e sitemap inclui somente as oito canonicas autorizadas.

- Revisao de escopo autorizada pelo usuario em 13/09/2026: publicar primeiro uma PREVIA PUBLICA no dominio para permitir teste fisico no celular e ajustes online. Esse modo e separado da producao indexavel, exige CI/build/inventario/hash/commit corretos, backup e envio manual, sem tags/anuncios/indexacao. Revisoes humanas e celular ficam pendentes apos esse envio; nao concluir a etapa nem emitir recibo de producao como se tivessem sido realizados.

- Executar todos os criterios prePublishGates antes do envio; verificacao-online e feita depois.
- Nenhum erro critico/importante aberto. Registrar limitacoes menores sem esconder testes nao realizados.
- Testar em celular real disponivel; emulacao sozinha nao comprova desempenho no aparelho.
- Conferir aliases reaproveitados, ausencia de conteudo antigo e exclusao de midias/PDFs retirados.
- Nunca enviar backups, comprovacoes, .git, arquivos privados ou node_modules ao site.
- Publicacao e uma acao distinta de build e push; verificar conteudo e rotas servidos apos atualizar caches.

## Criterios de conclusao

- **rotas-e-links**: Verificar 27 rotas, aliases necessarios, capitalizacao, links locais, navegacao direta e 404 real.
- **fluxos-completos**: Sete ferramentas e aliases reaproveitados percorridos; erros, cancelamentos e downloads reais validados.
- **desktop-mobile-final**: Capturas em todos os tamanhos definidos e teste em celular real; sem sobreposicao, estouro de texto ou travamento.
- **pacote-publicavel**: Build sem falhas, arquivos publicos completos e exclusivos; nenhuma evidencia, backup, instrucao interna ou segredo.
- **recuperacao-pronta**: Identificar backup/release anterior e ensaiar recuperacao em destino separado; nao restaurar em producao durante o teste.
- **verificacao-online**: Conferir HTTPS, www/canonical, home nova, aliases reaproveitados, caches, arquivos e bundle servido apos deploy.

## Bloqueios

- Qualquer criterio previo ausente impede a publicacao FINAL INDEXAVEL. A previa publica autorizada segue a excecao registrada acima. Falha online impede concluir a etapa, mesmo com build aprovado.

## Evidencias

Registrar cada criterio com resultado real, metodo, arquivo de evidencia e SHA-256.
Criterio pendente ou falho impede concluir. Revisao manual identifica o revisor.
Consultar o modelo: `node .portal-planejamento/scripts/verificar.mjs modelo 10`.
