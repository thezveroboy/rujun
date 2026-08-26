// РУЖУН — точка входа. Небесные острова в джунглях: сцена, цикл frame(),
// ввод, стартовое меню, генерация мира через seed. Всё детерминировано от seed.

import * as THREE from 'three';
import { hashStr, mulberry32 } from './core/rng.js';
import { islandAt, islandRng, buildIslandMesh, WORLD_HALF, SEA_LEVEL } from './world/islands.js';

const ui = {
  menu: document.getElementById('menu'),
  loading: document.getElementById('loading'),
  seedInput: document.getElementById('seedInput'),
  btnStart: document.getElementById('btnStart'),
  hp: document.getElementById('hp'),
  seedinfo: document.getElementById('seedinfo'),
  prompt: document.getElementById('prompt'),
  hud: document.getElementById('hud'),
  flash: document.getElementById('flash'),
};

// --- Сцена / рендер / камера (третий человек) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fb4e8);
scene.fog = new THREE.Fog(0x8fb4e8, 120, 900);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.getElementById('app').appendChild(renderer.domElement);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Свет: мягкое небо + направленный «солнечный» луч (день/ночь — позже).
scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x4a5a3a, 0.75));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.1);
sun.position.set(120, 220, 80);
scene.add(sun);

// --- Состояние игрока (камера-стрелок) ---
const player = {
  pos: new THREE.Vector3(0, 8, 0),   // высота — над островом
  yaw: 0,
  pitch: -0.15,
  eyeHeight: 4,
  speed: 26,
};

// --- Ввод ---
let pointerLocked = false;
renderer.domElement.addEventListener('click', () => {
  if (!pointerLocked && gameStarted) renderer.domElement.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
});
addEventListener('mousemove', (e) => {
  if (!pointerLocked) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch -= e.movementY * 0.0022;
  const lim = Math.PI / 2 - 0.03;
  player.pitch = Math.max(-lim, Math.min(lim, player.pitch));
});

const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; });
addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- Вспомогательные UI ---
let flashTimer = 0;
function flash(text, ms = 2200) {
  ui.flash.textContent = text;
  ui.flash.style.display = 'block';
  flashTimer = ms;
}
function showPrompt(text) { ui.prompt.textContent = text; ui.prompt.style.display = 'block'; }
function hidePrompt() { ui.prompt.style.display = 'none'; }

// --- Мир: небесные острова через seed (src/world/islands.js). ---
const world = { seed: 0, meshes: [] };

function clearWorld() {
  for (const m of world.meshes) scene.remove(m);
  world.meshes = [];
}

// Высота пола под точкой (верх ближайшего острова или уровень моря над пустотой).
function groundHeightAt(x, z) {
  let best = SEA_LEVEL; // над пустотой — море
  for (const m of world.meshes) {
    const dx = m.position.x - x, dz = m.position.z - z;
    if (dx * dx + dz * dz > 40 * 40) continue; // радиус стояния 40 м
    if (m.position.y > best) best = m.position.y;
  }
  return best;
}

// Сетка островов для отрисовки: берём существующие острова в пределах ±WORLD_HALF.
function sampleIslands(seed, cap) {
  const step = 512; // расстояние между точками сетки
  const built = [];
  for (let gx = -Math.ceil(WORLD_HALF / step); gx <= Math.ceil(WORLD_HALF / step); gx++) {
    for (let gz = -Math.ceil(WORLD_HALF / step); gz <= Math.ceil(WORLD_HALF / step); gz++) {
      if (built.length >= cap) break;
      const isl = islandAt(gx * step, gz * step, seed);
      if (isl && Math.hypot(isl.cx, isl.cz) <= WORLD_HALF) built.push(isl);
    }
  }
  return built;
}

function generateWorld(seed) {
  world.seed = seed;
  clearWorld();
  const rng = mulberry32((seed | 0) ^ 0x9e3779b9);

  // Игрок появляется на ближайшем существующем острове к случайной точке.
  let spawnIsl = null;
  for (let r = 0; r <= WORLD_HALF && !spawnIsl; r += 64) {
    const a = rng() * Math.PI * 2;
    const cx = Math.round(player.pos.x + Math.cos(a) * r);
    const cz = Math.round(player.pos.z + Math.sin(a) * r);
    spawnIsl = islandAt(cx, cz, seed);
  }
  if (!spawnIsl) { player.pos.set(0, 120, 0); return; } // крайний фолбэк
  player.pos.y = spawnIsl.topY + 3;

  for (const isl of sampleIslands(seed, 24)) {
    world.meshes.push(buildIslandMesh(isl, islandRng(isl.cx, isl.cz, seed)));
  }
}

// --- Игровой цикл (время через performance.now(), НЕ THREE.Clock) ---
let gameStarted = false;
function frame(now) {
  requestAnimationFrame(frame);
  const t = now / 1000; // секунды реального времени

  if (gameStarted && pointerLocked) {
    const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const move = new THREE.Vector3();
    if (keys['KeyW']) move.add(fwd);
    if (keys['KeyS']) move.sub(fwd);
    if (keys['KeyD']) move.add(right);
    if (keys['KeyA']) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(player.speed * 0.016);
      player.pos.add(move);
      player.yaw = Math.atan2(move.x, move.z);
    }
    // Приземление на ближайший остров или уровень моря над пустотой.
    player.pos.y = groundHeightAt(player.pos.x, player.pos.z) + 2;
    // Камера следует за игроком сзади-сверху.
    const dir = new THREE.Vector3(
      -Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(-player.pitch),
      -Math.cos(player.yaw) * Math.cos(player.pitch)
    );
    camera.position.copy(player.pos).addScaledVector(dir, 8);
    camera.lookAt(player.pos);
  }

  if (flashTimer > 0) {
    flashTimer -= 16;
    if (flashTimer <= 0) ui.flash.style.display = 'none';
  }

  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// --- Старт игры ---
ui.btnStart.addEventListener('click', () => {
  const seedText = ui.seedInput.value.trim();
  let seed;
  if (seedText === '') {
    // Случайный сид — из строки времени/случая.
    seed = hashStr('rujun:' + Date.now() + ':' + Math.random());
  } else {
    seed = parseInt(seedText, 10);
    if (!Number.isFinite(seed)) seed = hashStr('seed:' + seedText);
  }
  generateWorld(seed);
  gameStarted = true;
  ui.menu.style.display = 'none';
  ui.loading.style.display = 'flex';
  setTimeout(() => { ui.loading.style.display = 'none'; }, 300);
  renderer.domElement.requestPointerLock();
  ui.seedinfo.textContent = 'seed: ' + seed;
  flash('Добро пожаловать в Ружун');
});
