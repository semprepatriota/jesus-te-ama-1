# Etapa 05: Tres ferramentas iniciais

Status real: estado.json. Dependencia: etapa 4 concluida. Paginas contabilizadas: 3.

## Objetivo

Entregar as tres primeiras ferramentas usando a base comum.

## Entregas

- /comprimir-video/: qualidade, resolucao e comparacao do tamanho.
- /video-para-whatsapp/: experiencia simplificada de compatibilidade e tamanho alvo.
- /converter-para-mp4/: conversao com codecs suportados e orientacao preservada.

## Regras

- Compartilhar o motor do compressor e WhatsApp, mas oferecer controles e conteudo distintos.
- Tamanho alvo e uma meta; se a saida exceder, ajustar dentro de limite de tentativas ou avisar.
- Nao aumentar resolucao por padrao; nao prometer compressao sem perda.
- Verificar suporte real antes de prometer H.264/AAC; nao trocar apenas a extensao.
- Limites do WhatsApp precisam de fonte atual; evitar valor maximo fixo apresentado como universal.

## Criterios de conclusao

- **compressor**: Conferir dimensoes, tamanho real, duracao e qualidade visual; declarar quando nao houve reducao.
- **whatsapp**: Preset entrega formato previsto e informa claramente se o alvo foi atingido; testar compartilhamento em aparelho disponivel.
- **conversor-mp4**: Arquivo resultante possui container e codecs declarados, abre corretamente e preserva orientacao/audio.
- **saidas-validadas**: Usar ffprobe e decode completo no computador, comparar inicio/meio/fim e reproduzir exportacoes em navegadores suportados.

## Bloqueios

- Download vazio, arquivo ilegivel, audio fora de sincronia, orientacao errada ou resultado apresentado incorretamente.

## Evidencias

Registrar cada criterio com resultado real, metodo, arquivo de evidencia e SHA-256.
Criterio pendente ou falho impede concluir. Revisao manual identifica o revisor.
Consultar o modelo: `node .portal-planejamento/scripts/verificar.mjs modelo 5`.
