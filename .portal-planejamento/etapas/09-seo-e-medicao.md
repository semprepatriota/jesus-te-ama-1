# Etapa 09: SEO e medicao; preparacao AdSense

Status real: estado.json. Dependencia: etapa 8 concluida. Paginas contabilizadas: 0.

## Objetivo

Preparar descoberta, medicao e monetizacao sem ativar anuncios antes da hora.

## Entregas

- Titulos, descricoes, canonical, sitemap e robots coerentes com o mapa.
- Eventos de uso sem dados pessoais: abertura, inicio, sucesso, cancelamento e falha por categoria.
- Consentimento e configuracao AdSense inicialmente desativada, conforme contas reais.
- Build publico separado e integracao dos testes/gate no workflow de publicacao.

## Regras

- Configurar medicao nova conscientemente; nao recuperar tags antigas retiradas na etapa 2.
- Nao enviar nome, WhatsApp, URL com dados pessoais, nome do arquivo, GPS ou metadados ao Analytics.
- Sem ID AdSense real, nao criar ads.txt ficticio nem inserir codigos de exemplo.
- Aprovacao AdSense e externa; site pode publicar sem anuncios. Anuncios ficam desativados ate aprovacao real.
- Nao colocar anuncios em paginas incompletas, 404/progresso/tela vazia.
- Reservar espaco para anuncios para evitar deslocamentos; separar de controles de selecionar e baixar.
- Trocar workflow que publica a raiz por build em dist com testes e verificacao de pacote antes do deploy.

## Criterios de conclusao

- **seo-e-sitemap**: Canonical unico por pagina, sitemap so com rotas indexaveis, robots sem bloqueio involuntario e dados estruturados coerentes.
- **analytics-sem-dados-pessoais**: Inspecionar eventos e requisicoes; nenhum dado de arquivo/contato ou evento duplicado.
- **consentimento**: Aceitar, recusar e alterar preferencia funcionam; verificar tags/armazenamento de acordo com configuracao real.
- **configuracao-anuncios**: Desativacao comprovada quando nao aprovado; se ativado futuramente, ID/ads.txt reais e posicionamento validado.
- **artefato-e-pipeline**: Build reproduzivel, workflow aponta ao pacote publico, gate bloqueia falha e arquivos internos e materiais antigos retirados nao entram no artefato.

## Bloqueios

- Dados pessoais em eventos, anuncio ativo indevidamente, segredo no bundle, sitemap incorreto ou workflow publicando backup/fontes internas.

## Evidencias

Registrar cada criterio com resultado real, metodo, arquivo de evidencia e SHA-256.
Criterio pendente ou falho impede concluir. Revisao manual identifica o revisor.
Consultar o modelo: `node .portal-planejamento/scripts/verificar.mjs modelo 9`.
