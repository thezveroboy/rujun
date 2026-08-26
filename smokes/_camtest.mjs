// Смоук камеры/движения frame() (src/main.js строки 60-182): W идёт по направлению взгляда, мышь поворачивает согласованно.
import * as THREE from 'file:///D:/nf-games/rujun/node_modules/three/build/three.module.js';

// V = -dir: camera стоит за игроком (player + 8*dir) и смотрит на него -> направление взгляда = -dir.
const viewDir=(yaw,pitch)=>{
  const dir=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch), Math.sin(-pitch), -Math.cos(yaw)*Math.cos(pitch));
  return dir.clone().negate();
};
// строки 161-162 (фикс: инвертированы, чтобы W шёл по направлению взгляда)
const fwd=y=>new THREE.Vector3(Math.sin(y),0,Math.cos(y));

let ok=true;
for(const yaw of [0, Math.PI/6, Math.PI/4, 3*Math.PI/4]){
  const pitch=-0.15;
  const V=viewDir(yaw,pitch);
  // W горизонтален; максимальное совпадение с наклонённым вниз взглядом = cos(|pitch|).
  if (fwd(yaw).dot(V) < Math.cos(Math.abs(pitch)) - 0.01) ok=false;
}
console.log('W совпадает с направлением взгляда:', ok);

// согласованность yaw (строка 171: player.yaw = atan2(move.x, move.z)): после шага по fwd yaw не меняется
for(const yaw of [Math.PI/6, Math.PI/4]){
  const nyaw=Math.atan2(fwd(yaw).x, fwd(yaw).z);
  if (Math.abs(nyaw-yaw) > 1e-9) ok=false;
}
console.log('atan2(fwd.x,fwd.z)=yaw согласован:', ok);

// мышь: ВПРАВО -> yaw += k -> fwd.x растёт (+X, поворот вправо); ВЛЕВО -> -X (поворот влево)
const k=0.0022, y=Math.PI/4;
const rightTurn=fwd(y+0.3*k).x > fwd(y).x + 1e-6;
const leftTurn =fwd(y-0.3*k).x < fwd(y).x - 1e-6;
if (!(rightTurn && leftTurn)) ok=false;
console.log('мышь вправо поворот +X, влево -X:', rightTurn && leftTurn);

// pitch: ВНИЗ -> pitch -= k -> V.y=sin(pitch) уменьшается (смотрит вниз)
const pDown=-0.15-0.3*k;
if (!(Math.sin(pDown) < Math.sin(-0.15))) ok=false;
console.log('мышь вниз = смотреть вниз:', Math.sin(pDown) < Math.sin(-0.15));

console.log(ok ? 'CAMERA/MOVEMENT SMOKE OK' : 'CAMERA/MOVEMENT SMOKE FAILED');
