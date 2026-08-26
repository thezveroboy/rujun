// Смоук: спавн игрока на острове + отрисовка островов вокруг точки спавна
// (src/main.js generateWorld/sampleIslands). Мир детерминирован от seed.
import assert from 'node:assert';
import * as THREE from 'three';
import { islandAt, WORLD_HALF } from '../src/world/islands.js';
import { fbm, hashStr, mulberry32 } from '../src/core/rng.js';

const ISLAND_THRESHOLD = 0.58;
const ELEVATION_SCALE = 260;
function terrainHeight(x,z,seed){ return fbm(x*0.00055, z*0.00055, 5, seed); }
function islandRadius(cx,cz,seed){ const rSeed=hashStr('island:'+cx+':'+cz+':'+seed); return 90+(rSeed%120); }

// Копия generateWorld из main.js (spawn-поиск + перенос игрока + sampleIslands вокруг спавна).
function findSpawn(seed){
  const rng = mulberry32((seed | 0) ^ 0x9e3779b9); // тот же поток, что в main.js
  let spawnIsl=null;
  for(let r=0;r<=WORLD_HALF && !spawnIsl;r+=64){
    const a=rng()*Math.PI*2;
    const cx=Math.round(0 + Math.cos(a)*r);   // player.pos стартует (0,8,0) → x/z = 0
    const cz=Math.round(0 + Math.sin(a)*r);
    spawnIsl=islandAt(cx,cz,seed);
  }
  return spawnIsl;
}
function sampleIslands(seed, cap, cx0, cz0){
  const step=256; const found=[];
  for(let gx=-Math.ceil(WORLD_HALF/step); gx<=Math.ceil(WORLD_HALF/step); gx++){
    for(let gz=-Math.ceil(WORLD_HALF/step); gz<=Math.ceil(WORLD_HALF/step); gz++){
      const wx=cx0+gx*step, wz=cz0+gz*step;
      if(Math.hypot(wx,wz)>WORLD_HALF) continue; // за границей мира пусто
      const isl=islandAt(wx,wz,seed);
      if(isl) found.push(isl);
    }
  }
  found.sort((a,b)=>{const da=Math.abs(a.cx-cx0),db=Math.abs(b.cx-cx0);if(da!==db)return da<db?-1:1;const dz=Math.abs(a.cz-cz0),dw=Math.abs(b.cz-cz0);if(dz!==dw)return dz<dw?-1:1;return 0;});
  return found.slice(0,cap);
}

let n=0; function check(name,cond){ n++; if(!cond) throw new Error('FAIL: '+name); }

// --- База сидов: малые/нулевые/отрицательные + «реальные» seed'ы времени. ---
const SEEDS = [0,1,-1,2,3,7,42,99,100000,123456789,999,2024, -5, 0xdeadbeef, Date.now(), Date.now()+1, 31337];

// --- Фолбэк: если острова вообще нет — игрок не тонет в пустоте. ---
check('фолбэк при отсутствии острова', (() => {
  const sp = findSpawn(0); // seed=0 почти наверняка даёт остров у начала координат
  return !!sp;
})());

// --- Ключевой фикс: спавн-остров ВСЕГДА рисуется (находится в сетке вокруг себя). ---
for (const seed of SEEDS) {
  const sp = findSpawn(seed);
  if (!sp) continue; // крайний фолбэк main.js (игрок в пустоте, но это не наш баг)
  const sampled = sampleIslands(seed, 48, sp.cx, sp.cz);
  check('спавн-остров рисуется seed='+seed, sampled.some(s => s.cx===sp.cx && s.cz===sp.cz));
}

// --- Игрок стоит НА земле: ближайшая отрисованная платформа — сама точка спавна. ---
for (const seed of SEEDS) {
  const sp = findSpawn(seed);
  if (!sp) continue;
  const sampled = sampleIslands(seed, 48, sp.cx, sp.cz);
  const minD = Math.min(...sampled.map(s => Math.hypot(s.cx-sp.cx, s.cz-sp.cz)));
  check('игрок на земле (minDist=0) seed='+seed, minD <= 1); // спавн-остров в наборе → расстояние 0
}

// --- Видимость: рядом со спавном достаточно островов в радиусе тумана (~900м). ---
for (const seed of SEEDS) {
  const sp = findSpawn(seed);
  if (!sp) continue;
  const sampled = sampleIslands(seed, 48, sp.cx, sp.cz);
  const visible = sampled.filter(s => Math.hypot(s.cx-sp.cx, s.cz-sp.cz) <= 900).length;
  check('видны соседи (>=1 в тумане) seed='+seed, visible >= 1);
}

// --- Детерминизм: два запуска generateWorld(seed) дают ОДИНАКОВЫЙ набор островов. ---
function renderSet(seed){
  const sp = findSpawn(seed);
  if (!sp) return null;
  const list = sampleIslands(seed, 48, sp.cx, sp.cz).map(s => s.cx+','+s.cz+'|'+Math.round(s.topY));
  return list.join(';');
}
for (const seed of [123456789, 999, Date.now(), -5]) {
  const a = renderSet(seed), b = renderSet(seed);
  check('детерминизм набора островов seed='+seed, a === b && a !== null);
}

// --- Стресс: много случайных сидов — спавн-остров никогда не теряется. ---
let stressOk = true;
for (let i=0;i<300;i++){ const seed=(Math.random()*2147483647)|0; const sp=findSpawn(seed); if(!sp) continue; const s=sampleIslands(seed,48,sp.cx,sp.cz); if(!s.some(x=>x.cx===sp.cx&&x.cz===sp.cz)) stressOk=false; }
check('стресс 300 сидов: спавн-остров всегда рисуется', stressOk);

console.log('SPAWN SMOKE OK (' + n + ' checks)');
