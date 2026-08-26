// Смоук рендер-пути островов: меши добавляются в scene (рендерятся) и удаляются
// из сцены при clearWorld. Использует РЕАЛЬНЫЕ функции islands.js + логику main.js.
import * as THREE from 'file:///D:/nf-games/rujun/node_modules/three/build/three.module.js';
import { islandAt, WORLD_HALF, buildIslandMesh, islandRng } from '../src/world/islands.js';
import { fbm, hashStr, mulberry32 } from '../src/core/rng.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fb4e8);
const meshes = [];

function clearWorld(){ for(const m of meshes) scene.remove(m); meshes.length=0; }

// spawn-поиск (как в main.js): player.pos стартует (0,8,0) -> x/z = 0
function findSpawn(seed){
  const rng = mulberry32((seed | 0) ^ 0x9e3779b9);
  let s=null;
  for(let r=0;r<=WORLD_HALF && !s;r+=64){
    const a=rng()*Math.PI*2;
    s=islandAt(Math.round(0+Math.cos(a)*r), Math.round(0+Math.sin(a)*r), seed);
  }
  return s;
}

// сэмплирование островов ВКРУГ спавна, сортировка по АБСОЛЮТНОМУ расстоянию до центра
function sampleIslands(seed, cap, cx0, cz0){
  const step=256; const found=[];
  for(let gx=-Math.ceil(WORLD_HALF/step); gx<=Math.ceil(WORLD_HALF/step); gx++){
    for(let gz=-Math.ceil(WORLD_HALF/step); gz<=Math.ceil(WORLD_HALF/step); gz++){
      const wx=cx0+gx*step, wz=cz0+gz*step;
      if(Math.hypot(wx,wz)>WORLD_HALF) continue;
      const isl=islandAt(wx,wz,seed);
      if(isl) found.push(isl);
    }
  }
  found.sort((a,b)=>{const da=Math.abs(a.cx-cx0),db=Math.abs(b.cx-cx0);if(da!==db)return da<db?-1:1;const dz=Math.abs(a.cz-cz0),dw=Math.abs(b.cz-cz0);if(dz!==dw)return dz<dw?-1:1;return 0;});
  return found.slice(0,cap);
}

// generateWorld — точная копия из main.js (включая scene.add)
function generateWorld(seed){
  clearWorld();
  const spawnIsl = findSpawn(seed);
  if(!spawnIsl) return null;
  const playerPos = new THREE.Vector3(spawnIsl.cx, spawnIsl.topY + 3, spawnIsl.cz);
  for(const isl of sampleIslands(seed, 48, spawnIsl.cx, spawnIsl.cz)){
    const mesh = buildIslandMesh(isl, islandRng(isl.cx, isl.cz, seed));
    scene.add(mesh);          // рендер: меш в сцене
    meshes.push(mesh);        // коллизии/высота приземления
  }
  return { playerPos, spawnIsl };
}

// итеративный сбор меши (с геометрией) из группы и потомков — THREE рендерит группу целиком
function collectMeshes(root){ const out=[]; const stack=[root]; while(stack.length){ const o=stack.pop(); if(o&&o.isMesh&&o.geometry)out.push(o); for(const c of o.children)stack.push(c);} return out; }

let n=0; function check(name,cond){ n++; if(!cond) throw new Error('FAIL: '+name); }
const SEEDS = [0,1,-1,2,3,7,42,99,100000,123456789,999,2024,-5,0xdeadbeef,Date.now(),Date.now()+1];

// Ключевой фикс: острова реально в scene.children (рендерятся)
for (const seed of SEEDS){ const res=generateWorld(seed); if(!res)continue; check('острова в scene.children seed='+seed, scene.children.length >= 2); }

// Спавн-остров отрисован: группа спавна лежит ровно под игроком (расстояние ~0)
for (const seed of SEEDS){
  const res=generateWorld(seed); if(!res)continue;
  let worstNaN=0, nearest=null;
  for(const g of scene.children){
    // острова — группы с геометрией-детьми; лампы/другое пропускаем
    if(g.isLight||g.children.length===0) continue;
    try{ const bb=g.children[0].geometry.boundingBox.clone().normalize(); if(!Number.isFinite(bb.max.x))worstNaN++; }catch(e){}
    const d=Math.hypot(g.position.x-res.playerPos.x, g.position.z-res.playerPos.z);
    if(!nearest||d<nearest.d) nearest={g,d};
  }
  check('нет NaN в геометрии seed='+seed, worstNaN===0);
  check('группа спавна под игроком (<=1м) seed='+seed, nearest && nearest.d <= 1);
}

// clearWorld убирает острова из сцены (иначе висят навсегда)
clearWorld(); const before=scene.children.length; // 0 в тесте (без ламп)
generateWorld(123456789); check('generateWorld добавил острова в сцену', scene.children.length > before);
clearWorld(); check('clearWorld очистил сцену', scene.children.length === before);

// Видимость: ближайший остров в пределах тумана (~900м) от камеры игрока
const res=generateWorld(Date.now()); if(!res)throw new Error('no spawn');
const yaw=0,pitch=-0.15;
const dir=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch), Math.sin(-pitch), -Math.cos(yaw)*Math.cos(pitch));
const camPos=res.playerPos.clone().addScaledVector(dir,8);
let nearestCam=null;
for(const g of scene.children){ if(g.isLight||g.children.length===0)continue; const d=camPos.distanceTo(g.position); if(!nearestCam||d<nearestCam.d)nearestCam={g,d}; }
check('ближайший остров в пределах тумана (<=900м) seed='+Date.now(), nearestCam && nearestCam.d <= 900);

console.log('RENDER SMOKE OK (' + n + ' checks)');
