import * as THREE from 'three';

/** 通用簡單粒子 (沙塵、爆炸) */
export class SimpleParticles {
  constructor(scene, { max = 600, color = 0xe8d2a0, size = 1.5, additive = false, opacity = 0.5, gravity = -2 } = {}) {
    this.max = max; this.gravity = gravity;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.alpha = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uOp: { value: opacity } },
      vertexShader: `attribute float aAlpha; varying float vA; uniform float uSize;
        void main(){ vA=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=uSize*(2.0-aAlpha)*(300./-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOp; varying float vA;
        void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(uColor, smoothstep(.5,0.,d)*vA*uOp); }`,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.cursor = 0;
  }
  spawn(p, v, life = 1) {
    const i = this.cursor++ % this.max;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    this.life[i] = life; this.alpha[i] = 1;
    this._lifeMax = this._lifeMax || new Float32Array(this.max);
    this._lifeMax[i] = life;
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      this.alpha[i] = Math.max(0, this.life[i] / this._lifeMax[i]);
      this.vel[i * 3 + 1] += this.gravity * dt;
      this.vel[i * 3] *= 0.98; this.vel[i * 3 + 2] *= 0.98;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
  }
}
