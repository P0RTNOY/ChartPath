/** A small deterministic PRNG. It is not intended for cryptographic use. */
export interface SeededRandom {
  readonly next: () => number;
  readonly symmetric: () => number;
}

export function createSeededRandom(seed: number): SeededRandom {
  let state = mixSeed(seed);

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };

  return {
    next,
    symmetric: () => next() * 2 - 1,
  };
}

function mixSeed(seed: number): number {
  const low = seed | 0;
  const high = Math.trunc(seed / 4_294_967_296) | 0;
  let value = low ^ Math.imul(high, 0x9e3779b1);
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return value ^ (value >>> 15);
}
