import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ASSETS } from '../config/assets.js';
import * as Placeholders from './placeholders.js';

const loader = new GLTFLoader();
const cache = {};

/** 把模型正規化：置中、底部貼地、最長邊縮放成 size，再套用朝向修正 */
function normalize(obj, cfg) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const s = cfg.size / Math.max(size.x, size.y, size.z);
  obj.position.set(-center.x * s, -box.min.y * s + (cfg.offsetY || 0), -center.z * s);
  obj.scale.setScalar(s);
  const wrap = new THREE.Group();
  const rot = new THREE.Group();
  rot.rotation.y = cfg.rotationY || 0;
  rot.add(obj);
  wrap.add(rot);
  wrap.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return wrap;
}

/** 預先載入所有 slot；失敗時自動 fallback 為 placeholder */
export async function preloadAssets(onProgress) {
  const keys = Object.keys(ASSETS);
  let done = 0;
  await Promise.all(keys.map(async (key) => {
    const cfg = ASSETS[key];
    if (cfg.url) {
      try {
        const gltf = await loader.loadAsync(cfg.url);
        cache[key] = normalize(gltf.scene, cfg);
      } catch (e) {
        console.warn(`[assets] ${key} 載入失敗，改用 placeholder`, e);
      }
    }
    done++; onProgress && onProgress(done / keys.length);
  }));
}

/** 取得某個 slot 的一個新實例 */
export function createModel(key) {
  if (cache[key]) return cache[key].clone(true);
  const builder = Placeholders[key];
  return builder ? builder(ASSETS[key]) : new THREE.Group();
}
