import * as THREE from 'three';

// 白色核心 + 炫彩 (彩虹色相流轉) 的排氣火焰粒子
const VS = `
attribute float aAge;
attribute float aSeed;
uniform float uSize;
varying float vAge;
varying float vSeed;
void main(){
  vAge = aAge; vSeed = aSeed;
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  float s = uSize * (1.0 - aAge*0.55) * (0.7 + aSeed*0.6);
  gl_PointSize = s * (300.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FS = `
uniform float uTime;
varying float vAge;
varying float vSeed;
vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0); }
void main(){
  vec2 c = gl_PointCoord-0.5;
  float d = length(c);
  if(d>0.5) discard;
  float soft = smoothstep(0.5,0.0,d);
  vec3 rainbow = hue(fract(uTime*0.35 + vSeed*0.6 + vAge*0.9));
  rainbow = mix(rainbow, vec3(0.7,0.4,1.0), 0.2) * 1.3;
  vec3 col = mix(vec3(1.0), rainbow, smoothstep(0.05,0.4,vAge));
  float a = soft * (1.0 - vAge) * (1.0 - vAge*0.3);
  gl_FragColor = vec4(col * (1.0 - vAge*0.4), a*0.55);
}`;

export class ExhaustFlame {
  constructor(scene, max = 700) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max).fill(1);
    this.life = new Float32Array(max).fill(1);
    this.seed = new Float32Array(max);
    for (let i = 0; i < max; i++) this.seed[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aAge', new THREE.BufferAttribute(this.age, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(this.seed, 1));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS,
      uniforms: { uTime: { value: 0 }, uSize: { value: 0.5 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.cursor = 0;
    this.acc = 0;
  }

  /** origins: Vector3[] 世界座標；dir: 噴射方向 (向後)；baseVel: 車速度；power 0~1.5 */
  emit(dt, origins, dir, baseVel, power) {
    if (power <= 0.02) return;
    this.acc += dt * 150 * power * origins.length;
    while (this.acc >= 1) {
      this.acc -= 1;
      const o = origins[(this.cursor) % origins.length];
      const i = this.cursor % this.max; this.cursor++;
      const sp = 9 + power * 10 + Math.random() * 6;
      const j = 0.9 + power * 0.6;
      this.pos[i * 3] = o.x; this.pos[i * 3 + 1] = o.y; this.pos[i * 3 + 2] = o.z;
      this.vel[i * 3] = baseVel.x * 0.6 + dir.x * sp + (Math.random() - 0.5) * j;
      this.vel[i * 3 + 1] = baseVel.y * 0.6 + dir.y * sp + (Math.random() - 0.5) * j;
      this.vel[i * 3 + 2] = baseVel.z * 0.6 + dir.z * sp + (Math.random() - 0.5) * j;
      this.age[i] = 0;
      this.life[i] = 0.14 + power * 0.16 + Math.random() * 0.12;
    }
  }

  update(dt, t, power) {
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uSize.value = 0.35 + power * 0.25;
    for (let i = 0; i < this.max; i++) {
      if (this.age[i] >= 1) continue;
      this.age[i] = Math.min(1, this.age[i] + dt / this.life[i]);
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt + dt * 1.2;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAge.needsUpdate = true;
  }
}

/** 噴嘴的白色發光核心 (附在車上) */
export function createNozzleGlow() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 1.2, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  cone.rotation.x = -Math.PI / 2; cone.position.z = 0.8;
  g.add(core, cone);
  g.userData = { core, cone };
  return g;
}
