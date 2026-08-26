// Смоук: генерация островов через seed (src/world/islands.js).
import assert from 'node:assert';
import * as THREE from 'three';
import { islandAt, worldExists, islandRng, buildIslandMesh, SEA_LEVEL } from '../src/world/islands.js';
import { hashStr } from '../src/core/rng.js';

let n = 0;
function check(name, cond) {
  n++;
  if (!cond) throw new Error('FAIL: ' + name);
}

// --- Детерминизм: один и тот же (x,z,seed) → одинаковый результат. ---
const S = 12345;
check('islandAt детерминирован', islandAt(100, -200, S)?.topY === islandAt(100, -200, S)?.topY);
check('worldExists детерминирован', worldExists(100, -200, S) === worldExists(100, -200, S));

// --- Пустые клетки: пустота остаётся пустой. ---
const empty = islandAt(-5000 + 37, 5000 - 91, S);
check('пустая клетка → null', !empty);
if (empty) throw new Error('ожидалась пустая клетка');

// --- Границы мира: за пределами ±WORLD_HALF острова не генерируются. ---
const far = islandAt(5001, 0, S);
check('за границей мира пусто', !far);

// --- Меш: все вершины конечны (NaN=0), платформа + деревья собраны. ---
for (let seed = 1; seed <= 8; seed++) {
  const isl = islandAt(200 * seed, -300 * seed, S);
  if (!isl) continue; // пустые клетки пропускаем
  const rng = islandRng(isl.cx, isl.cz, S);
  const mesh = buildIslandMesh(isl, rng);
  check('mesh.group !== null', !!mesh && mesh.isGroup || (mesh && mesh.children.length > 0));
  let bad = 0;
  for (const child of mesh.children) {
    if (!child.geometry) continue;
    const arr = child.geometry.attributes.position.array;
    for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) bad++;
  }
  check('mesh без NaN (seed=' + seed + ')', bad === 0);
}

// --- worldExists согласован с islandAt. ---
for (let x = -4000; x <= 4000; x += 512) {
  for (let z = -4000; z <= 4000; z += 512) {
    const a = worldExists(x, z, S);
    const b = !!islandAt(x, z, S);
    check('worldExists==islandAt (' + x + ',' + z + ')', a === b);
  }
}

// --- Радиус в разумных пределах. ---
const isl = islandAt(777, -888, S);
if (isl) {
  assert.ok(isl.radius >= 90 && isl.radius <= 209, 'radius out of range: ' + isl.radius);
  assert.ok(isl.topY > SEA_LEVEL, 'topY below sea');
}

console.log('ISLANDS SMOKE OK (' + n + ' checks)');
