export const toolNames = Object.freeze(['comprimir-video', 'video-para-whatsapp', 'converter-para-mp4', 'cortar-video', 'limpar-metadados-video', 'extrair-audio', 'capturar-miniatura']);
const failureCategories = new Set(['unsupported', 'limit', 'timeout', 'processing']);

export function failureCategory(code) {
  if (typeof code !== 'string') return 'processing';
  if (/UNSUPPORTED|CODEC|FORMAT/.test(code)) return 'unsupported';
  if (/LIMIT|SIZE|DURATION|MEMORY/.test(code)) return 'limit';
  if (/TIMEOUT|DEADLINE/.test(code)) return 'timeout';
  return 'processing';
}

export function createMeasurement({ enabled = false, send = () => {} } = {}) {
  let preference = 'denied', active = null, opened = false;
  function emit(event, tool, category) {
    if (!enabled || preference !== 'granted' || !toolNames.includes(tool)) return false;
    const payload = Object.freeze({ event: `hf_tool_${event}`, tool, ...(event === 'failure' ? { category: failureCategories.has(category) ? category : 'processing' } : {}) });
    try { send(payload); } catch { return false; }
    return true;
  }
  return Object.freeze({
    enabled,
    get preference() { return preference; },
    setPreference(value) { preference = enabled && value === 'granted' ? 'granted' : 'denied'; if (preference === 'denied' && active) active.eligible = false; },
    open(tool) { if (opened || !toolNames.includes(tool)) return; if (emit('open', tool)) opened = true; },
    start(tool) { if (!toolNames.includes(tool)) return null; if (active) this.finish(active.token, 'cancel'); const token = Symbol(); active = { token, tool, eligible: enabled && preference === 'granted' }; emit('start', tool); return token; },
    finish(token, outcome, category) { if (!active || active.token !== token || !['success', 'cancel', 'failure'].includes(outcome)) return; const job = active; active = null; if (job.eligible) emit(outcome, job.tool, category); },
    dispose() { active = null; preference = 'denied'; }
  });
}
