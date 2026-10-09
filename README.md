# Sand Hunter — 沙漠懸浮機車競速射擊 (Three.js + Vite)

## 操作
| 按鍵 | 功能 |
|---|---|
| W / S | 前進 / 煞車倒退 |
| A / D | 左右轉向 |
| Shift | 加速 (Boost) |
| Space | 往上飛 |
| Q / E | 旋轉視角 (R 重置) |
| 滑鼠左鍵 / F / J | 射擊 (準心內自動鎖定) |

## 替換成你自己的 GLB
1. 把 `.glb` 放進 `public/models/`
2. 修改 `src/config/assets.js` 對應的 slot：
   - `player` 玩家飛車 (`exhausts` = 排氣火焰噴出點)
   - `enemy` 敵機
   - `rockArch` / `rockPillar` / `ruin` 場景物件
3. `url: null` 時會用內建的程式化模型。模型會自動置中、貼地、縮放到 `size`；朝向不對就調 `rotationY` (遊戲中前方 = -Z)。

## 開發 / 部署
```bash
npm install
npm run dev      # 本機 http://localhost:5173
npm run build    # 輸出 dist/
```
Vercel：推到 GitHub 後在 Vercel Import，Framework 選 Vite（已附 vercel.json）。
