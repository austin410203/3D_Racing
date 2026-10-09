import * as THREE from 'three';

const sandMat = new THREE.MeshStandardMaterial({ color: 0xe0c48e, roughness: 0.95, flatShading: true });

function lumpy(geo, amt, seed = 1) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 1.7 + seed) * Math.cos(z * 1.3 + y * 0.9 + seed) * amt;
    p.setXYZ(i, x + n, y + n * 0.5, z + n);
  }
  geo.computeVertexNormals();
  return geo;
}

export function player(cfg) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.8, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x222830, metalness: 0.7, roughness: 0.3 }));
  body.rotation.x = Math.PI / 2; body.position.y = 0.6; g.add(body);
  return g;
}

export function enemy() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0),
    new THREE.MeshStandardMaterial({ color: 0x3a2e40, metalness: 0.8, roughness: 0.25, flatShading: true }));
  core.position.y = 1; g.add(core);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3366 }));
  eye.position.set(0, 1, 0.65); g.add(eye);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff5588, transparent: true, opacity: 0.7 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.06, 6, 32), ringMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = 1; ring.name = 'spin'; g.add(ring);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function rockArch(cfg) {
  const s = cfg.size / 30;
  const geo = lumpy(new THREE.TorusGeometry(10 * s, 3.2 * s, 10, 24, Math.PI), 1.2 * s, Math.random() * 9);
  const m = new THREE.Mesh(geo, sandMat);
  m.castShadow = m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m);
  return g;
}

export function rockPillar(cfg) {
  const s = cfg.size / 14;
  const g = new THREE.Group();
  const geo = lumpy(new THREE.CylinderGeometry(3 * s, 4.5 * s, 14 * s, 9, 4), 0.9 * s, Math.random() * 9);
  const m = new THREE.Mesh(geo, sandMat); m.position.y = 7 * s;
  const cap = new THREE.Mesh(lumpy(new THREE.CylinderGeometry(5.5 * s, 3 * s, 3 * s, 9), 0.7 * s), sandMat);
  cap.position.y = 14 * s;
  [m, cap].forEach((x) => { x.castShadow = x.receiveShadow = true; g.add(x); });
  return g;
}

export function ruin(cfg) {
  const s = cfg.size / 12;
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xcdb084, roughness: 1 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(12 * s, 7 * s, 8 * s), mat);
  wall.position.y = 3.5 * s; g.add(wall);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.5 * s, 4 * s, 0.4 * s),
    new THREE.MeshStandardMaterial({ color: 0x6b4e33 }));
  door.position.set(0, 2 * s, 4.05 * s); g.add(door);
  g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return g;
}
