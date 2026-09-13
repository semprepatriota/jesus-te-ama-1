# Etapa 06: Quatro ferramentas complementares

Status real: estado.json. Dependencia: etapa 5 concluida. Paginas contabilizadas: 4.

## Objetivo

Entregar corte, limpeza de metadados DE VIDEO, extracao de audio e captura de miniatura.

## Entregas

- Corte com inicio/fim, previa e duracao de saida.
- Limpador: selecionar video -> inspecionar -> escolher campos -> gerar copia -> reinspecionar -> comparar -> baixar.
- Extracao de audio com formatos de saida realmente suportados.
- Captura de frame no instante escolhido, respeitando proporcao e rotacao.

## Regras

- Limpador exclusivo de videos. Iniciar MP4/MOV nos codecs validados; ampliar WebM apos teste especifico.
- Remover campos pessoais suportados: autor, titulo, comentario, datas internas e localizacao quando acessiveis.
- Capitulos, capas e faixas auxiliares exigem selecao explicita. Parametros de rotacao, cor e decodificacao nao podem ser removidos cegamente.
- Preferir remux sem recodificacao para limpeza; nao prometer remocao de campos proprietarios desconhecidos ou de dados embutidos nos pixels/audio.
- Metadados necessarios a reproducao permanecem. Datas do sistema de arquivos podem ser recriadas no download.
- Limpeza nao torna o video anonimo, nao apaga informacoes visiveis e nao muda direitos autorais ou reconhecimento do conteudo.
- No corte, informar diferenca entre corte por keyframe e corte exato; reencodar quando necessario e suportado.
- Nao anunciar MP3 disponivel sem encoder validado; nomes/extensoes devem corresponder a saida.

## Criterios de conclusao

- **corte**: Testar inicio/fim invalidos, duracao muito curta e corte no meio de GOP; conferir intervalo e sincronismo.
- **metadados-video**: Fixtures com campos conhecidos; comparar antes/depois com leitor independente (ffprobe/ExifTool), declarar dados remanescentes e verificar rotacao/cor/audio; no modo sem recodificacao comparar payload das faixas preservadas.
- **extracao-audio**: Validar formato, duracao e audio real; video sem audio recebe resposta apropriada.
- **captura-miniatura**: Conferir o frame exportado, dimensoes, proporcao, rotacao e escolha de outro instante.
- **saidas-validadas**: Decode completo das saidas de video/audio; amostras antes/depois e verificacao de ausencia de upload durante todas as ferramentas.

## Bloqueios

- Mensagem 'limpo' sem reinspecao, dados selecionados ainda presentes sem aviso, video alterado indevidamente ou falha de reproducao.

## Evidencias

Registrar cada criterio com resultado real, metodo, arquivo de evidencia e SHA-256.
Criterio pendente ou falho impede concluir. Revisao manual identifica o revisor.
Consultar o modelo: `node .portal-planejamento/scripts/verificar.mjs modelo 6`.
