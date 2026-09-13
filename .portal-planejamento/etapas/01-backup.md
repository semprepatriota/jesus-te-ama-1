# Etapa 01: Backup e base de recuperacao

Status real: estado.json. Dependencia: nenhuma. Paginas contabilizadas: 0.

## Objetivo

Criar um ponto de recuperacao verificavel antes de alterar o site.

## Entregas

- Inventario de arquivos, Git HEAD e estado das alteracoes anteriores.
- Backup da copia de trabalho e do historico Git, com manifesto SHA-256.
- Ensaio de restauracao em pasta separada e comprovacao de integridade.

## Regras

- Incluir arquivos alterados e nao versionados; um git bundle sozinho nao preserva essas mudancas.
- Nao editar paginas durante a copia e nunca restaurar automaticamente sobre a origem.
- Manter backups fora de Git e de qualquer pacote publicado.

## Criterios de conclusao

- **inventario**: Listar todos os arquivos incluidos e o total de bytes, com HEAD e estado Git.
- **backup-integridade**: SHA-256 de cada copia deve ser igual ao arquivo lido na origem; manifesto completo.
- **restauracao-ensaio**: Reabrir copias de quiz, VSL, obrigado, CNAME, PDF, musica e video em outra pasta e conferir hashes.
- **originais-preservados**: Conferir os hashes da origem depois da copia; nenhuma alteracao no conteudo original.

## Bloqueios

- Arquivo ausente, hash divergente, Git com lock ou copia interrompida.

## Evidencias

Registrar cada criterio com resultado real, metodo, arquivo de evidencia e SHA-256.
Criterio pendente ou falho impede concluir. Revisao manual identifica o revisor.
Consultar o modelo: `node .portal-planejamento/scripts/verificar.mjs modelo 1`.
