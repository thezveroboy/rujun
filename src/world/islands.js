// src/world/islands.js — генерация небесных островов через seed.
// Мир — большой куб ±WORLD_HALF по осям X/Z, заполненный floating islands над морем
// (SEA_LEVEL). Поле высот [0,1] вычисляется fbm и НЕ потребляет поток чанкового rng,
// поэтому детерминизм мира не зависит от порядка загрузки чанков.

import * as THREE from 'three';
import { fbm, hashStr, mulberry32 } from '../core/rng.js';

export const WORLD_HALF = 3000;      // мир: ±WORLD_HALF по каждой оси
export const SEA_LEVEL = 0;          // уровень моря (пустота между островами)
export const ISLAND_THRESHOLD = 0.58; // порог heightfield для появления острова
export const ELEVATION_SCALE = 260;   // масштаб высоты острова над морем
export const CHUNK_SIZE = 1024;      // размер чанка мира

// Непрерывное поле высот [0,1] по всему миру.
function terrainHeight(x, z, seed) {
  return fbm(x * 0.00055, z * 0.00055, 5, seed);
}

// Есть ли хоть что-то на месте (x,z)?
export function worldExists(x, z, seed) {
  return terrainHeight(x, z, seed) >= ISLAND_THRESHOLD;
}

// Информация об острове под (cx,cz), или null если там пусто.
export function islandAt(cx, cz, seed) {
  const h = terrainHeight(cx, cz, seed);
  if (h < ISLAND_THRESHOLD) return null;
  // Радиус — от отдельного хэша клетки (не из потока rng чанка).
  const radius = islandRadius(cx, cz, seed);
  const topY = SEA_LEVEL + (h - ISLAND_THRESHOLD) * ELEVATION_SCALE;
  return { cx, cz, topY, radius, height: h };
}

// Детерминированный rng для меша острова (от сида клетки), НЕ из потока чанка.
export function islandRng(cx, cz, seed) {
  return mulberry32(hashStr('islandrng:' + cx + ':' + cz + ':' + seed));
}

// Радиус острова (90..209 м), от отдельного хэша клетки.
function islandRadius(cx, cz, seed) {
  const rSeed = hashStr('island:' + cx + ':' + cz + ':' + seed);
  return 90 + (rSeed % 120);
}

// Число деревьев на острове по радиусу (больше = крупнее платформа).
function treeCount(radius, rng) {
  const base = Math.round((radius / 100) * 3); // ~3 дерева на 100 м радиуса
  return base + Math.floor(rng() * (base + 1));
}

// Строит меш острова: неровная платформа-плато + джунгли (деревья).
export function buildIslandMesh(isl, rng) {
  const group = new THREE.Group();
  group.position.set(isl.cx, isl.topY, isl.cz);
  // Группа без поворота: деревья растут вверх (местная +Y -> мировая +Y).

  // --- Платформа: диск с органичной деформацией краёв (skill complex-geometry). ---
  const segs = 48;
  const geo = new THREE.CircleGeometry(1, segs);
  const verts = geo.attributes.position.array;
  for (let i = 0; i < verts.length; i += 3) {
    const x = verts[i], z = verts[i + 2];
    const d = Math.hypot(x, z) || 1; // защита от деления на ноль в центре диска
    // холмы по fbm + случайный неровный край
    const hill = fbm(x * 0.01, z * 0.01, 3, hashStr('hill:' + isl.cx + ':' + isl.cz)) * 6;
    const edge = (rng() - 0.5) * 8;
    verts[i] += (x / d) * hill * 0.25 + (x / d) * edge;
    verts[i + 2] += (z / d) * hill * 0.25 + (z / d) * edge;
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ color: 0x4f8a3e });
  const platform = new THREE.Mesh(geo, mat);
  platform.castShadow = true;
  platform.receiveShadow = true;
  // масштаб платформы под радиус острова (CircleGeometry по умолчанию — единица)
  platform.scale.setScalar(isl.radius);
  // Поворот платформы на -PI/2 кладёт диск горизонтально (в XZ), нормалью вверх (+Y).
  platform.rotation.x = -Math.PI / 2;
  group.add(platform);

  // --- Джунгли: деревья по платформе — растут из её поверхности. ---
  const count = treeCount(isl.radius, rng);
  for (let t = 0; t < count; t++) {
    const a = rng() * Math.PI * 2;
    const rr = rng() * isl.radius * 0.85;
    const tx = Math.cos(a) * rr, tz = Math.sin(a) * rr;
    // база дерева — на высоте поверхности платформы +1м (группа без поворота:
    // местная y = мировая y), чтобы сосны росли из земли вверх, а не висели в воздухе.
    const ty = 1.0;
    const tree = buildTree(tx, ty, tz, rng);
    group.add(tree);
  }
  return group;
}

// Простое дерево: ствол-цилиндр + крона из двух конусов.
function buildTree(x, y, z, rng) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const hgt = 8 + rng() * 10;
  const trunkGeo = new THREE.CylinderGeometry(0.6, 1.0, hgt, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = hgt / 2;
  trunk.castShadow = true;
  g.add(trunk);
  const leafR = 5 + rng() * 3;
  const leafGeo = new THREE.ConeGeometry(leafR, leafR * 1.6, 7);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6b2a });
  for (let l = 0; l < 2; l++) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.y = hgt + leafR * (0.4 + l * 0.5);
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}
