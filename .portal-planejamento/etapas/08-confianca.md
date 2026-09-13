# Etapa 08: Sete paginas de confianca

Status real: estado.json. Dependencia: etapa 7 concluida. Paginas contabilizadas: 7.

## Objetivo

Entregar sete paginas de confianca que descrevam a operacao real do portal.

## Entregas

- Sobre, contato, privacidade, termos, cookies, direitos autorais e seguranca/processamento local.
- Contato publico autorizado e funcional.
- Informacoes coerentes com arquivos locais, bibliotecas, telemetria, publicidade e provedores utilizados.

## Regras

- Nao publicar e-mail de login, endereco ou identidade do usuario por inferencia.
- Sem formulario ficticio: escolher canal real; se formulario for usado, validar entrega e protecao de abuso.
- 'O video fica no aparelho' nao significa ausencia total de rede ou cookies; explicar a coleta que realmente existir.
- Nao prometer anonimato ou remocao universal de metadados.
- Pagina de direitos autorais e canal de contato devem corresponder a operacao e jurisdicao aplicaveis.

## Criterios de conclusao

- **sete-paginas**: Sete rotas completas, acessiveis pelo rodape e sem referencias a outra empresa.
- **contato-real**: Canal aprovado pelo usuario e funcionamento verificado sem envio externo nao autorizado.
- **privacidade-coerente**: Conferir textos contra requisicoes e armazenamento observados nas ferramentas/analytics.
- **identidade-confirmada**: Nome/responsavel e dados publicos confirmados; nenhuma informacao de exemplo tratada como real.

## Bloqueios

- Contato inventado, dado pessoal publicado sem autorizacao ou politica contradizendo a operacao.

## Evidencias

Registrar cada criterio com resultado real, metodo, arquivo de evidencia e SHA-256.
Criterio pendente ou falho impede concluir. Revisao manual identifica o revisor.
Consultar o modelo: `node .portal-planejamento/scripts/verificar.mjs modelo 8`.
