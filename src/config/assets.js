// ============================================================
//  模型替換接口 (Model Slots)
//  把你自己的 .glb 放進 public/models/，然後改這裡的 url 即可。
//  url 設為 null → 使用內建的程式化替代模型 (placeholder)。
//
//  size      : 模型最長邊會被自動縮放到這個長度 (公尺)
//  rotationY : 模型朝向修正 (弧度)。遊戲中「前方」= -Z
//  offsetY   : 模型垂直位移
//  exhausts  : 排氣口位置 (相對於縮放後模型，單位公尺)，火焰會從這裡噴出
// ============================================================
export const ASSETS = {
  player: {
    url: '/models/hoverbike.glb',
    size: 3.2,
    rotationY: Math.PI,
    offsetY: 0,
    exhausts: [
      { x: -0.19, y: 1.12, z: 1.6 },
      { x: 0.19, y: 1.12, z: 1.6 },
    ],
  },
  enemy: {
    url: '/models/enemy_drone.glb',
    size: 3.6,
    rotationY: 0,
    offsetY: 0,
  },
  rockArch: { url: null, size: 30, rotationY: 0, offsetY: 0 },
  rockPillar: { url: null, size: 14, rotationY: 0, offsetY: 0 },
  ruin: { url: null, size: 12, rotationY: 0, offsetY: 0 },
};
