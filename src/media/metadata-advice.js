export function metadataAdvice(field) {
  const key = `${field.id} ${field.label}`.toLowerCase();
  if (/location|localiza|gps|xyz|loci|latitude|longitude/.test(key)) return { category: 'Localizacao', recommended: true };
  if (/artist|author|autor|owner|copyright|albumartist/.test(key)) return { category: 'Identificacao', recommended: true };
  if (/date|creation|data|timestamp/.test(key)) return { category: 'Data e horario', recommended: true };
  if (/camera|device|serial|make|model|software|encoder|©too/.test(key)) return { category: 'Dispositivo ou programa', recommended: true };
  if (/title|comment|description|album|genre|lyrics|images/.test(key)) return { category: 'Conteudo descritivo', recommended: false };
  return { category: 'Campo nao classificado', recommended: false };
}

export function recommendedFields(fields) {
  return fields.filter(field => metadataAdvice(field).recommended).map(field => field.id);
}
