// Рендер-смоук острова (исправленная версия): платформа горизонтальна вверх, деревья растут вертикально.
import * as THREE from 'file:///D:/nf-games/rujun/node_modules/three/build/three.module.js';
import { islandAt, buildIslandMesh, islandRng } from '../src/world/islands.js';

let allOk = true;
for (const seed of [911, 304, 123456789]) {
  const isl = islandAt(911, 304, seed); if (!isl) continue;
  const scene = new THREE.Scene();
  const g = buildIslandMesh(isl, islandRng(isl.cx, isl.cz, seed));
  scene.add(g);
  scene.updateMatrixWorld(true);

  // Платформа: норма (убираем трансляцию из matrixWorld).
  let platform = null;
  for (const c of g.children) if (c.type === 'Mesh' && !platform) platform = c;
  const m = platform.matrixWorld.clone();
  m.elements[12] = 0; m.elements[13] = 0; m.elements[14] = 0;
  const normalW = new THREE.Vector3(0, 0, 1).applyMatrix4(m);
  normalW.normalize();

  // Деревья: мировой bbox должен быть высоким по Y (вертикальный рост), не по Z.
  let treesVertical = true;
  for (const t of g.children.filter(c => c.type === 'Group')) {
    const tmp = new THREE.Vector3();
    let minY = Infinity, maxY = -Infinity;
    for (const child of t.children) if (child.isMesh) {
      child.getWorldPosition(tmp);
      minY = Math.min(minY, tmp.y); maxY = Math.max(maxY, tmp.y);
    }
    if (maxY - minY < 2.0) treesVertical = false; // дерево должно вытянуться вверх по Y
  }

  console.log(`seed=${seed} topY=${isl.topY.toFixed(1)}: platform-normal=(${normalW.x.toFixed(2)}, ${normalW.y.toFixed(2)}, ${normalW.z.toFixed(2)}) up=${Math.abs(normalW.y - 1) < 0.15}, trees-vertical(Y-extent>=2m)=${treesVertical}`);
  if (!(Math.abs(normalW.y - 1) < 0.15 && treesVertical)) allOk = false;
}
console.log(allOk ? 'RENDER SMOKE OK (platform horizontal up, trees grow vertically)' : 'RENDER SMOKE FAILED');
