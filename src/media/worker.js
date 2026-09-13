import { analyze, exportMp4 } from './core.js';
import { LIMITS, MediaError } from './policy.js';
import { operate } from './extra-operations.js';

self.onmessage = async ({ data }) => {
  const { id, operation, file, options, limits } = data;
  try {
    let result;
    if (operation === 'analyze') result = await analyze(file, { ...LIMITS, ...limits });
    else if (operation === 'export') result = await exportMp4(file, options, { ...LIMITS, ...limits }, progress => self.postMessage({ id, type: 'progress', value: progress }));
    else if (['cut', 'clean', 'audio', 'thumbnail'].includes(operation)) result = await operate(file, operation, options, { ...LIMITS, ...limits }, progress => self.postMessage({ id, type: 'progress', value: progress }));
    else throw new MediaError('INVALID_OPERATION', 'Operacao desconhecida.');
    self.postMessage({ id, type: 'result', value: result });
  } catch (error) {
    const memory = error?.name === 'QuotaExceededError' || /out of memory|allocation failed/i.test(error?.message ?? '');
    self.postMessage({ id, type: 'error', value: {
      code: error instanceof MediaError ? error.code : memory ? 'MEMORY_LIMIT' : 'INVALID_MEDIA',
      message: error instanceof MediaError ? error.message : memory ? 'Memoria insuficiente. Tente um arquivo menor.' : 'O video esta corrompido, incompleto ou usa um formato nao suportado.',
    } });
  } finally { self.close(); }
};
