import { fail } from './policy.js';

// StreamTarget can rewrite earlier offsets. Store bounded blocks instead of concatenating writes.
export class BoundedOutput {
  constructor(limit, blockSize = 1024 ** 2) {
    this.limit = limit;
    this.blockSize = blockSize;
    this.blocks = new Map();
    this.length = 0;
    this.peakAllocatedBytes = 0;
  }
  write({ position, data }) {
    if (!Number.isSafeInteger(position) || position < 0 || !(data instanceof Uint8Array)) fail('INVALID_OUTPUT', 'Posicao de escrita invalida.');
    const end = position + data.byteLength;
    if (!Number.isSafeInteger(end) || end > this.limit) fail('OUTPUT_LIMIT', 'A saida excedeu o limite local; nenhum arquivo parcial sera disponibilizado.');
    let offset = 0;
    while (offset < data.byteLength) {
      const absolute = position + offset;
      const index = Math.floor(absolute / this.blockSize);
      const within = absolute % this.blockSize;
      if (!this.blocks.has(index)) this.blocks.set(index, new Uint8Array(Math.min(this.blockSize, this.limit - index * this.blockSize)));
      const block = this.blocks.get(index);
      const size = Math.min(data.byteLength - offset, block.length - within);
      block.set(data.subarray(offset, offset + size), within);
      offset += size;
    }
    this.length = Math.max(this.length, end);
    this.peakAllocatedBytes = Math.max(this.peakAllocatedBytes, [...this.blocks.values()].reduce((sum, block) => sum + block.length, 0));
  }
  toBlob(type) {
    const parts = [];
    for (let start = 0; start < this.length; start += this.blockSize) {
      const index = Math.floor(start / this.blockSize);
      const size = Math.min(this.blockSize, this.length - start);
      parts.push((this.blocks.get(index) ?? new Uint8Array(size)).subarray(0, size));
    }
    return new Blob(parts, { type });
  }
  dispose() { this.blocks.clear(); this.length = 0; }
}
