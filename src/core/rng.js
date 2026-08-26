// Детерминированный RNG: хэши координат, шум, последовательные генераторы.
// Всё проистекает из строки-сида через hashStr -> под-генераторы.

export function hashStr(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Хэш координат (x,y[,z], seed) -> [0,1). Без состояния, работает с любыми целыми координатами.
export function hash2(x, y, seed = 0) {
  let h = (seed | 0) ^ Math.imul(Math.floor(x) | 0, 374761393) ^ Math.imul(Math.floor(y) | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hash3(x, y, z, seed = 0) {
  let h = (seed | 0) ^ Math.imul(Math.floor(x) | 0, 374761393) ^ Math.imul(Math.floor(y) | 0, 668265263) ^ Math.imul(Math.floor(z) | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const makeRng = mulberry32;

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
export const range = (rng, min, max) => min + rng() * (max - min);
export const rangeInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

// Интерполированный value-noise из hash2
export function valueNoise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2(ix, iy, seed), n10 = hash2(ix + 1, iy, seed);
  const n01 = hash2(ix, iy + 1, seed), n11 = hash2(ix + 1, iy + 1, seed);
  return n00 * (1 - sx) * (1 - sy) + n10 * sx * (1 - sy) + n01 * (1 - sx) * sy + n11 * sx * sy;
}

export function fbm(x, y, octaves = 4, seed = 0) {
  let v = 0, a = 1, f = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    v += a * valueNoise(x * f, y * f, seed + i * 101);
    max += a; a *= 0.5; f *= 2;
  }
  return v / max;
}
