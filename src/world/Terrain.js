import * as THREE from 'three';

// 沙丘高度函數 (純函數，碰撞/懸浮都用它)
export function heightAt(x, z) {
  return (
    Math.sin(x * 0.012) * Math.cos(z * 0.010) * 9 +
    Math.sin(x * 0.031 + z * 0.017) * 3.5 +
    Math.cos(z * 0.045 - x * 0.02) * 1.6 +
    Math.sin((x + z) * 0.004) * 6
  );
}

function rippleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#d9bb85'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 1) {
    for (let x = 0; x < 512; x += 4) {
      const w = Math.sin((y + Math.sin(x * 0.0245) * 14) * (Math.PI * 2 / 16));
      const l = Math.floor(200 + w * 22 + Math.random() * 8);
      g.fillStyle = `rgb(${l + 22},${l},${l - 50})`;
      g.fillRect(x, y, 4, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export class Terrain {
  constructor(scene) {
    this.size = 900; this.seg = 180; this.step = this.size / this.seg;
    const geo = new THREE.PlaneGeometry(this.size, this.size, this.seg, this.seg);
    geo.rotateX(-Math.PI / 2);
    this.base = geo.attributes.position.array.slice();
    this.tex = rippleTexture();
    this.tex.repeat.set(this.size / 14, this.size / 14);
    const mat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.92, metalness: 0 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
    this.cx = Infinity; this.cz = Infinity;
  }
  update(px, pz) {
    const cx = Math.round(px / this.step) * this.step;
    const cz = Math.round(pz / this.step) * this.step;
    if (cx === this.cx && cz === this.cz) return;
    this.cx = cx; this.cz = cz;
    const p = this.mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = this.base[i * 3] + cx, z = this.base[i * 3 + 2] + cz;
      p.array[i * 3 + 1] = heightAt(x, z);
    }
    p.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.mesh.position.set(cx, 0, cz);
    this.tex.offset.set(cx / 14, -cz / 14);
  }
}
