import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ASSETS } from './config/assets.js';
import { preloadAssets, createModel } from './core/AssetLoader.js';
import { Terrain, heightAt } from './world/Terrain.js';
import { ExhaustFlame, createNozzleGlow } from './fx/ExhaustFlame.js';
import { SimpleParticles } from './fx/Particles.js';
import './style.css';

// ---------------- 基本場景 ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG = new THREE.Color(0xd8cdb4);
scene.fog = new THREE.Fog(FOG, 60, 420);
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 2000);

// 天空
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1500, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP;
      void main(){ float h=vP.y;
        vec3 top=vec3(0.22,0.47,0.82), mid=vec3(0.55,0.72,0.92), hor=vec3(0.85,0.80,0.70);
        vec3 c = h>0.12 ? mix(mid,top,smoothstep(0.12,0.6,h)) : mix(hor,mid,smoothstep(-0.02,0.12,h));
        float cl = sin(vP.x*9.)*sin(vP.z*7.+vP.y*20.)*0.5+0.5;
        c = mix(c, vec3(1.), smoothstep(0.7,1.0,cl)*smoothstep(0.05,0.3,h)*smoothstep(0.7,0.3,h)*0.45);
        gl_FragColor=vec4(c,1.); }`,
  })
);
scene.add(sky);

scene.add(new THREE.HemisphereLight(0xbfd8ff, 0xc9a26b, 1.1));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 200 });
scene.add(sun, sun.target);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.4, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// ---------------- 輸入 ----------------
const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', (e) => { keys[e.code] = false; });
let firing = false;
addEventListener('mousedown', (e) => { if (e.button === 0) firing = true; });
addEventListener('mouseup', (e) => { if (e.button === 0) firing = false; });

// ---------------- HUD ----------------
const $ = (id) => document.getElementById(id);
const hud = { speed: $('speed'), alt: $('alt'), kills: $('kills'), shield: $('shield-fill'), range: $('range'), reticle: $('reticle') };

// ---------------- 開始 ----------------
await preloadAssets((p) => { $('load-bar').style.width = `${p * 100}%`; });
$('loading').classList.add('hide');

const terrain = new Terrain(scene);

// ---- 場景物件 (可替換模型) ：環繞玩家無限重複 ----
const WRAP = 1600;
const props = [];
function rand(seed) { const x = Math.sin(seed * 127.1) * 43758.5453; return x - Math.floor(x); }
for (let i = 0; i < 70; i++) {
  const kind = i % 7 === 0 ? 'rockArch' : i % 3 === 0 ? 'ruin' : 'rockPillar';
  const m = createModel(kind);
  m.rotation.y = rand(i + 3) * Math.PI * 2;
  const sc = 0.6 + rand(i + 9) * 0.9; m.scale.setScalar(sc);
  m.userData.base = new THREE.Vector2((rand(i) - 0.5) * WRAP, (rand(i + 50) - 0.5) * WRAP);
  m.userData.radius = ASSETS[kind].size * 0.35 * sc;
  scene.add(m); props.push(m);
}
// 小石頭
const pebbleGeo = new THREE.SphereGeometry(1, 8, 6); pebbleGeo.scale(1, 0.4, 1);
const pebbles = new THREE.InstancedMesh(pebbleGeo, new THREE.MeshStandardMaterial({ color: 0xd6bd8c, roughness: 1 }), 220);
pebbles.receiveShadow = pebbles.castShadow = true;
scene.add(pebbles);
const pebbleBase = Array.from({ length: 220 }, (_, i) => [(rand(i + 300) - 0.5) * 600, (rand(i + 700) - 0.5) * 600, 0.8 + rand(i + 900) * 2.5]);

// ---- 玩家 ----
const player = new THREE.Group();
const bike = createModel('player');
player.add(bike);
scene.add(player);
const nozzles = ASSETS.player.exhausts.map((e) => {
  const g = createNozzleGlow();
  g.position.set(e.x, e.y, e.z);
  bike.add(g);
  return g;
});
const flame = new ExhaustFlame(scene);
const dust = new SimpleParticles(scene, { max: 500, color: 0xe2cc9c, size: 3.2, opacity: 0.18, gravity: 1.5 });
const sparks = new SimpleParticles(scene, { max: 600, color: 0xffb070, size: 1.4, additive: true, opacity: 1, gravity: -9 });
const flameLight = new THREE.PointLight(0xc8b8ff, 0, 12);
scene.add(flameLight);

const S = {
  pos: new THREE.Vector3(0, heightAt(0, 0) + 2, 0),
  vel: new THREE.Vector3(),
  yaw: 0, bank: 0, pitch: 0,
  camYaw: 0, shield: 1, kills: 0, cooldown: 0, power: 0,
};
const HOVER = 1.1, MAX = 52, BOOST = 82; // m/s  (≈ 190 / 295 km/h)

// ---- 子彈 ----
const boltGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6); boltGeo.rotateX(Math.PI / 2);
const boltMat = new THREE.MeshBasicMaterial({ color: 0x9ffcff });
const eBoltMat = new THREE.MeshBasicMaterial({ color: 0xff4a7a });
const eBoltGeo = new THREE.SphereGeometry(0.45, 10, 8);
const bullets = [];
function shoot(from, dir, enemy) {
  const m = new THREE.Mesh(enemy ? eBoltGeo : boltGeo, enemy ? eBoltMat : boltMat);
  m.position.copy(from);
  m.lookAt(from.clone().add(dir));
  scene.add(m);
  bullets.push({ m, v: dir.clone().multiplyScalar(enemy ? 45 : 220).add(enemy ? new THREE.Vector3() : S.vel), life: enemy ? 4 : 1.4, enemy });
}

// ---- 敵人 (可替換模型) ----
const enemies = [];
function spawnEnemy(e) {
  const a = S.yaw + (Math.random() - 0.5) * 1.6;
  const d = 160 + Math.random() * 120;
  const x = S.pos.x - Math.sin(a) * d, z = S.pos.z - Math.cos(a) * d;
  e.pos.set(x, heightAt(x, z) + 4 + Math.random() * 8, z);
  e.hp = 3; e.t = Math.random() * 10; e.cool = 2 + Math.random() * 2;
  e.m.visible = true;
}
for (let i = 0; i < 7; i++) {
  const m = createModel('enemy'); scene.add(m);
  const e = { m, pos: new THREE.Vector3(), hp: 3, t: 0, cool: 2 };
  spawnEnemy(e); enemies.push(e);
}
function explode(p, n = 50) {
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(8 + Math.random() * 18);
    sparks.spawn(p, v, 0.5 + Math.random() * 0.7);
  }
  for (let i = 0; i < 20; i++) dust.spawn(p, new THREE.Vector3().randomDirection().multiplyScalar(5), 1.5);
}

// ---------------- 迴圈 ----------------
const clock = new THREE.Clock();
const tmp = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let t = 0;

function update(dt) {
  t += dt;
  // ---- 控制 ----
  const throttle = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const steer = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
  const boost = (keys.ShiftLeft || keys.ShiftRight) && throttle > 0;
  if (keys.KeyQ) S.camYaw += dt * 2.2;
  if (keys.KeyE) S.camYaw -= dt * 2.2;
  if (keys.KeyR) S.camYaw = 0;

  const speed = Math.hypot(S.vel.x, S.vel.z);
  S.yaw += steer * dt * (2.2 - Math.min(speed / BOOST, 1) * 1.0);
  fwd.set(-Math.sin(S.yaw), 0, -Math.cos(S.yaw));
  right.set(Math.cos(S.yaw), 0, -Math.sin(S.yaw));

  const accel = throttle > 0 ? (boost ? 70 : 38) : throttle < 0 ? -30 : 0;
  S.vel.addScaledVector(fwd, accel * dt);
  // 側向抓地 + 阻力
  const lat = right.dot(S.vel);
  S.vel.addScaledVector(right, -lat * Math.min(1, dt * 3.5));
  const drag = throttle === 0 ? 0.6 : 0.25;
  S.vel.x *= 1 - drag * dt; S.vel.z *= 1 - drag * dt;
  const cap = boost ? BOOST : MAX;
  const hs = Math.hypot(S.vel.x, S.vel.z);
  if (hs > cap) { const k = 1 - Math.min(1, dt * 1.5) * (1 - cap / hs); S.vel.x *= k; S.vel.z *= k; }

  // 垂直：懸浮彈簧 + 重力 + 空白鍵上升
  const ground = heightAt(S.pos.x, S.pos.z);
  const h = S.pos.y - ground;
  S.vel.y -= 22 * dt;
  if (keys.Space) S.vel.y += 40 * dt;
  if (h < HOVER + 1.5) S.vel.y += (HOVER - h) * 28 * dt - S.vel.y * 4 * dt * (h < HOVER + 0.5 ? 1 : 0);
  S.vel.y = THREE.MathUtils.clamp(S.vel.y, -40, 22);
  S.pos.addScaledVector(S.vel, dt);
  const g2 = heightAt(S.pos.x, S.pos.z);
  if (S.pos.y < g2 + 0.4) { S.pos.y = g2 + 0.4; if (S.vel.y < 0) S.vel.y = 0; }
  if (S.pos.y > g2 + 90) S.vel.y = Math.min(S.vel.y, 0);

  // 碰撞岩石
  for (const p of props) {
    const dx = S.pos.x - p.position.x, dz = S.pos.z - p.position.z;
    const d = Math.hypot(dx, dz), r = p.userData.radius;
    if (d > 0.01 && d < r && S.pos.y < p.position.y + r * 1.4) {
      const nx = dx / d, nz = dz / d;
      S.pos.x = p.position.x + nx * r; S.pos.z = p.position.z + nz * r;
      const vn = S.vel.x * nx + S.vel.z * nz;
      if (vn < 0) { S.vel.x -= vn * nx * 1.6; S.vel.z -= vn * nz * 1.6; if (vn < -20) S.shield = Math.max(0, S.shield - 0.08); }
    }
  }

  // 姿態
  S.bank = THREE.MathUtils.lerp(S.bank, steer * 0.45 * Math.min(1, hs / 25), dt * 5);
  S.pitch = THREE.MathUtils.lerp(S.pitch, THREE.MathUtils.clamp(S.vel.y * 0.02, -0.3, 0.3) - throttle * 0.04, dt * 4);
  player.position.copy(S.pos).y += Math.sin(t * 6) * 0.05;
  player.rotation.set(S.pitch, S.yaw, S.bank, 'YXZ');

  // ---- 排氣火焰 ----
  const targetPower = throttle > 0 ? (boost ? 1.5 : 1) : Math.min(0.25, hs / MAX * 0.3) + (keys.Space ? 0.6 : 0);
  S.power = THREE.MathUtils.lerp(S.power, targetPower, dt * 8);
  player.updateMatrixWorld(true);
  const origins = nozzles.map((n) => n.getWorldPosition(new THREE.Vector3()));
  const back = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion);
  flame.emit(dt, origins, back, S.vel, S.power);
  flame.update(dt, t, S.power);
  nozzles.forEach((n) => {
    const f = 0.6 + S.power * 0.8 + Math.random() * 0.1;
    n.userData.core.scale.setScalar(f);
    n.userData.cone.scale.set(f, 0.4 + S.power * 1.4 + Math.random() * 0.2, f);
    n.userData.cone.position.z = 0.6 * n.userData.cone.scale.y;
  });
  flameLight.position.copy(origins[0]).lerp(origins[origins.length - 1], 0.5).addScaledVector(back, 1.5);
  flameLight.intensity = S.power * 6;

  // 沙塵
  if (h < 3.5 && hs > 8 && Math.random() < hs / 60) {
    for (let i = 0; i < 2; i++) {
      tmp.copy(S.pos).addScaledVector(back, 2).add(new THREE.Vector3((Math.random() - 0.5) * 3, -h + 0.3, (Math.random() - 0.5) * 3));
      dust.spawn(tmp, new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4).addScaledVector(S.vel, 0.15), 1.4);
    }
  }
  dust.update(dt); sparks.update(dt);

  // ---- 相機 ----
  const cy = S.yaw + S.camYaw;
  const dist = 5.2 + hs * 0.03;
  camPos.set(S.pos.x + Math.sin(cy) * dist, S.pos.y + 2.2 + hs * 0.006, S.pos.z + Math.cos(cy) * dist);
  const cg = heightAt(camPos.x, camPos.z) + 1;
  if (camPos.y < cg) camPos.y = cg;
  camera.position.lerp(camPos, 1 - Math.exp(-dt * 10));
  camLook.set(S.pos.x - Math.sin(cy) * 12, S.pos.y + 1.6, S.pos.z - Math.cos(cy) * 12);
  camera.lookAt(camLook);
  camera.fov = THREE.MathUtils.lerp(camera.fov, boost ? 80 : 68, dt * 3);
  camera.updateProjectionMatrix();

  // ---- 射擊 (左鍵 / F / J) ----
  const aimDir = new THREE.Vector3().subVectors(camLook, camera.position).normalize();
  let inRange = 0, best = null, bestDot = 0.985;
  for (const e of enemies) {
    if (!e.m.visible) continue;
    tmp.subVectors(e.pos, S.pos); const d = tmp.length();
    const dot = tmp.normalize().dot(aimDir);
    if (d < 220 && dot > 0.9) inRange++;
    if (d < 260 && dot > bestDot) { bestDot = dot; best = e; }
  }
  S.cooldown -= dt;
  if ((firing || keys.KeyF || keys.KeyJ) && S.cooldown <= 0) {
    S.cooldown = 0.09;
    const dir = best ? tmp.subVectors(best.pos, S.pos).add(new THREE.Vector3(0, 1, 0)).normalize().clone() : aimDir.clone();
    origins.forEach((o) => shoot(o.clone().addScaledVector(dir, 2).add(new THREE.Vector3(0, 0.3, 0)), dir, false));
  }
  hud.reticle.classList.toggle('lock', !!best);

  // ---- 敵人 ----
  for (const e of enemies) {
    if (!e.m.visible) { e.t -= dt; if (e.t < -2) spawnEnemy(e); continue; }
    e.t += dt;
    tmp.subVectors(S.pos, e.pos); const d = tmp.length();
    // 盤旋接近
    const orbit = new THREE.Vector3(-tmp.z, 0, tmp.x).normalize().multiplyScalar(14);
    const want = tmp.clone().normalize().multiplyScalar(d > 40 ? 34 : -6).add(orbit).addScaledVector(S.vel, 0.7);
    e.pos.addScaledVector(want, dt);
    const gy = heightAt(e.pos.x, e.pos.z) + 5 + Math.sin(e.t * 1.3) * 3;
    e.pos.y = THREE.MathUtils.lerp(e.pos.y, Math.max(gy, S.pos.y + 2), dt * 1.5);
    e.m.position.copy(e.pos);
    e.m.lookAt(S.pos.x, e.pos.y, S.pos.z);
    const spin = e.m.getObjectByName('spin'); if (spin) spin.rotation.z += dt * 4;
    e.cool -= dt;
    if (e.cool <= 0 && d < 150) {
      e.cool = 1.8 + Math.random() * 1.6;
      const lead = S.pos.clone().addScaledVector(S.vel, d / 45 * 0.6);
      shoot(e.pos.clone().add(new THREE.Vector3(0, 1, 0)), lead.sub(e.pos).normalize(), true);
    }
    if (d > 500) spawnEnemy(e);
  }

  // ---- 子彈更新 ----
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.m.position.addScaledVector(b.v, dt); b.life -= dt;
    let dead = b.life <= 0 || b.m.position.y < heightAt(b.m.position.x, b.m.position.z);
    if (!dead && !b.enemy) {
      for (const e of enemies) {
        if (e.m.visible && b.m.position.distanceTo(tmp.copy(e.pos).setY(e.pos.y + 1)) < 2.2) {
          dead = true; e.hp--; sparks.spawn(b.m.position, new THREE.Vector3().randomDirection().multiplyScalar(6), 0.3);
          if (e.hp <= 0) { explode(e.pos.clone().setY(e.pos.y + 1)); e.m.visible = false; e.t = 0; S.kills++; }
          break;
        }
      }
    } else if (!dead && b.enemy && b.m.position.distanceTo(tmp.copy(S.pos).setY(S.pos.y + 0.8)) < 1.8) {
      dead = true; S.shield = Math.max(0, S.shield - 0.12); explode(b.m.position, 15);
      document.body.classList.add('hit'); setTimeout(() => document.body.classList.remove('hit'), 120);
    }
    if (dead) { scene.remove(b.m); bullets.splice(i, 1); }
  }
  S.shield = Math.min(1, S.shield + dt * 0.02);
  if (S.shield <= 0) { S.shield = 1; S.kills = Math.max(0, S.kills - 3); explode(S.pos.clone(), 80); }

  // ---- 世界 ----
  terrain.update(S.pos.x, S.pos.z);
  for (const p of props) {
    const b = p.userData.base;
    const x = b.x + Math.round((S.pos.x - b.x) / WRAP) * WRAP;
    const z = b.y + Math.round((S.pos.z - b.y) / WRAP) * WRAP;
    if (p.position.x !== x || p.position.z !== z) p.position.set(x, heightAt(x, z) - 1.5, z);
  }
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  pebbleBase.forEach(([bx, bz, s], i) => {
    const x = bx + Math.round((S.pos.x - bx) / 600) * 600, z = bz + Math.round((S.pos.z - bz) / 600) * 600;
    mtx.compose(tmp.set(x, heightAt(x, z) - s * 0.15, z), q, sc.setScalar(s)); pebbles.setMatrixAt(i, mtx);
  });
  pebbles.instanceMatrix.needsUpdate = true;
  sun.position.set(S.pos.x + 60, S.pos.y + 100, S.pos.z + 40);
  sun.target.position.copy(S.pos);
  sky.position.copy(camera.position);

  // ---- HUD ----
  hud.speed.textContent = Math.round(Math.hypot(S.vel.x, S.vel.z) * 3.6);
  hud.alt.textContent = `地表 ${(S.pos.y - heightAt(S.pos.x, S.pos.z)).toFixed(1)} m · ${keys.Space ? '上昇' : S.vel.y < -1 ? '降下' : '滑走'}`;
  hud.kills.textContent = S.kills;
  hud.shield.style.width = `${S.shield * 100}%`;
  hud.range.textContent = `射程内 ${inRange}`;
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  composer.render();
  requestAnimationFrame(loop);
}
loop();
window.__game = { S, keys };
