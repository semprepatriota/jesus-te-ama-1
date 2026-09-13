import { LIMITS, MediaError, validateFile } from './policy.js';
export { LIMITS, MediaError } from './policy.js';
const defaultWorkerUrl = new URL('./video-worker.js', globalThis.document?.currentScript?.src || globalThis.location?.href || 'http://localhost/_portal/engine/engine.js');

export class VideoEngine {
  constructor({ workerUrl = defaultWorkerUrl, workerFactory = url => new Worker(url), limits = LIMITS, onState = () => {} } = {}) {
    this.workerUrl = workerUrl;
    this.workerFactory = workerFactory;
    this.limits = { ...LIMITS, ...limits };
    this.onState = onState;
    this.state = { phase: 'empty', stage: null, progress: null, metadata: null, error: null };
    this.file = null;
    this.output = null;
    this.worker = null;
    this.pending = null;
    this.generation = 0;
    this.urls = new Set();
  }
  emit(next) {
    this.state = { ...this.state, ...next };
    try { this.onState({ ...this.state }); } catch { /* A view error must not interrupt cleanup. */ }
  }
  releaseOutput() {
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls.clear();
    this.output = null;
  }
  stop() {
    this.generation++;
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(new MediaError('CANCELLED', 'Processamento cancelado.')); this.pending = null; }
    this.worker?.terminate();
    this.worker = null;
    this.releaseOutput();
  }
  run(operation, options) {
    const id = ++this.generation;
    return new Promise((resolve, reject) => {
      let worker;
      try { worker = this.workerFactory(this.workerUrl); }
      catch { reject(new MediaError('WORKER_UNAVAILABLE', 'O processamento local requer HTTPS ou a previa local por HTTP.')); return; }
      this.worker = worker;
      const finish = (error, value) => {
        if (this.worker !== worker || this.pending?.id !== id) return;
        clearTimeout(this.pending.timer);
        this.pending = null;
        worker.terminate();
        this.worker = null;
        if (error) reject(error); else resolve(value);
      };
      this.pending = { id, reject, timer: setTimeout(() => finish(new MediaError('TIME_LIMIT', 'O processamento demorou alem do limite. Tente um video menor.')), this.limits.timeoutMs) };
      worker.onmessage = ({ data }) => {
        if (data.id !== id || this.worker !== worker) return;
        if (data.type === 'progress') this.emit(data.value);
        else if (data.type === 'error') finish(new MediaError(data.value.code, data.value.message));
        else if (data.type === 'result') finish(null, data.value);
      };
      worker.onerror = event => { event.preventDefault(); finish(new MediaError('WORKER_ERROR', 'O processamento local foi interrompido. Tente novamente com um arquivo menor.')); };
      worker.onmessageerror = () => finish(new MediaError('WORKER_ERROR', 'Nao foi possivel receber a saida local.'));
      try { worker.postMessage({ id, operation, file: this.file, options, limits: this.limits }); }
      catch { finish(new MediaError('INVALID_FILE', 'Nao foi possivel abrir este arquivo local.')); }
    });
  }
  async open(file) {
    this.stop();
    this.file = file;
    this.emit({ phase: 'analysis', stage: 'reading', progress: null, metadata: null, error: null });
    const generation = this.generation;
    try {
      validateFile(file, this.limits);
      const resultPromise = this.run('analyze');
      const current = this.generation;
      const metadata = await resultPromise;
      if (current === this.generation) this.emit({ phase: 'ready', stage: null, metadata, progress: null });
      return metadata;
    } catch (error) {
      if (error.code !== 'CANCELLED' && generation + 1 >= this.generation) this.emit({ phase: 'error', stage: null, error: { code: error.code, message: error.message } });
      throw error;
    }
  }
  async process(operation, options = {}) {
    if (this.pending || ['analysis', 'processing'].includes(this.state.phase)) throw new MediaError('BUSY', 'Ja existe um trabalho em andamento.');
    if (!this.file || !this.state.metadata) throw new MediaError('NOT_READY', 'Abra e analise um video antes de exportar.');
    this.releaseOutput();
    this.emit({ phase: 'processing', stage: 'preparing', progress: 0, error: null });
    const promise = this.run(operation, options);
    const current = this.generation;
    try {
      const result = await promise;
      if (current === this.generation) {
        this.output = result;
        this.emit({ phase: 'done', stage: null, progress: 1, outputBytes: result.blob.size });
      }
      return result;
    } catch (error) {
      if (current === this.generation && error.code !== 'CANCELLED') this.emit({ phase: 'error', stage: null, error: { code: error.code, message: error.message } });
      throw error;
    }
  }
  exportMp4(options = {}) { return this.process('export', options); }
  cut(options) { return this.process('cut', options); }
  clean(options) { return this.process('clean', options); }
  extractAudio(options) { return this.process('audio', options); }
  capture(options) { return this.process('thumbnail', options); }
  downloadUrl() {
    if (!this.output || this.state.phase !== 'done') throw new MediaError('NOT_READY', 'Nenhuma saida validada disponivel.');
    if (this.urls.size) return [...this.urls][0];
    const url = URL.createObjectURL(this.output.blob);
    this.urls.add(url);
    return url;
  }
  cancel() { this.stop(); this.emit({ phase: 'cancelled', stage: null, progress: null, error: null, outputBytes: 0 }); }
  retry() { if (!this.file) return Promise.reject(new MediaError('NOT_READY', 'Nenhum arquivo para tentar novamente.')); return this.open(this.file); }
  dispose() { this.stop(); this.file = null; this.emit({ phase: 'empty', stage: null, progress: null, metadata: null, error: null, outputBytes: 0 }); }
  resources() { return { workers: this.worker ? 1 : 0, pending: this.pending ? 1 : 0, urls: this.urls.size, retainedOutputBytes: this.output?.blob.size ?? 0 }; }
}
