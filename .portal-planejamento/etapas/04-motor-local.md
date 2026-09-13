# Etapa 04: Motor local de processamento

Status real: estado.json. Dependencia: etapa 3 concluida. Paginas contabilizadas: 0.

## Objetivo

Preparar a base comum que executa as tarefas no aparelho do visitante.

## Entregas

- Prova tecnica de leitura e exportacao de videos com biblioteca mantida.
- Motor compartilhado com estados: vazio, analise, pronto, processando, concluido, cancelado e erro.
- Matriz de navegadores, codecs, limites de arquivo e licencas usadas.

## Regras

- Avaliar Mediabunny/WebCodecs e alternativas pontuais; verificar APIs da versao instalada e fixar dependencias.
- Um trabalho por vez inicialmente; carregar modulos sob demanda e liberar buffers e URLs temporarias.
- Container MP4/MOV/WebM nao garante suporte ao codec. Detectar capacidades antes de iniciar.
- Sem upload de arquivos de visitantes, sem telemetria de nomes/metadados e sem fallback oculto para servidor.
- Sem IndexedDB/cache persistente de midia por padrao. Bibliotecas e anuncios podem fazer rede; a alegacao de localidade se refere ao arquivo.

## Criterios de conclusao

- **compatibilidade**: Arquivos sinteticos H.264/AAC, video sem audio, MOV orientado e WebM; tratar codecs ausentes e arquivo corrompido.
- **ciclo-processamento**: Progresso baseado no processamento, cancelamento efetivo, nova tentativa e troca de arquivo sem resposta tardia sobrescrevendo o estado.
- **privacidade-rede**: Capturar trafego durante analise/exportacao e confirmar ausencia de bytes, nomes, miniaturas ou metadados de videos enviados.
- **limites-e-memoria**: Medir uso e tempo em amostras pequenas e maiores; cancelamento libera recursos; informar limites e falha de memoria.
- **licencas**: Registrar bibliotecas, versoes, licencas e dependencias; corrigir vulnerabilidades criticas aplicaveis.

## Bloqueios

- Upload inesperado, travamento sem recuperacao, codec prometido sem suporte ou dependencia sem licenca compativel.

## Evidencias

Registrar cada criterio com resultado real, metodo, arquivo de evidencia e SHA-256.
Criterio pendente ou falho impede concluir. Revisao manual identifica o revisor.
Consultar o modelo: `node .portal-planejamento/scripts/verificar.mjs modelo 4`.
