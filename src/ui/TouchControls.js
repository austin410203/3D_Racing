// 手機虛擬控制：左側搖桿 (移動/轉向)、右側按鈕 (射擊/加速/上升/視角)、
// 在畫面空白處拖曳 = 移動瞄準鏡
export function setupTouch({ keys, setAimPx, setFire }) {
  const state = { stick: { x: 0, y: 0 }, enabled: false };
  // 只有「主要輸入是手指」的裝置 (手機/平板) 才顯示；觸控筆電、桌機不顯示
  const isTouch = matchMedia('(pointer: coarse) and (hover: none)').matches;
  if (!isTouch) return state;
  state.enabled = true;
  document.body.classList.add('touch');

  const ui = document.createElement('div');
  ui.id = 'touch-ui';
  ui.innerHTML = `
    <div id="stick"><div id="knob"></div></div>
    <div id="btns">
      <button data-act="fire" class="big fire">FIRE</button>
      <button data-key="ShiftLeft" class="boost">BOOST</button>
      <button data-key="Space" class="up">▲ UP</button>
      <button data-key="KeyQ" class="cam">⟲</button>
      <button data-key="KeyE" class="cam">⟳</button>
    </div>`;
  document.body.appendChild(ui);

  // ---- 搖桿 ----
  const stick = ui.querySelector('#stick');
  const knob = ui.querySelector('#knob');
  let stickId = null;
  const R = 55;
  const moveStick = (t) => {
    const r = stick.getBoundingClientRect();
    let dx = t.clientX - (r.left + r.width / 2);
    let dy = t.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) { dx *= R / len; dy *= R / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    state.stick.x = dx / R;
    state.stick.y = dy / R;
  };
  stick.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0]; stickId = t.identifier; moveStick(t);
  }, { passive: false });

  // ---- 按鈕 ----
  ui.querySelectorAll('button').forEach((b) => {
    const on = (v) => (e) => {
      e.preventDefault();
      b.classList.toggle('on', v);
      if (b.dataset.key) keys[b.dataset.key] = v;
      if (b.dataset.act === 'fire') setFire(v);
    };
    b.addEventListener('touchstart', on(true), { passive: false });
    b.addEventListener('touchend', on(false), { passive: false });
    b.addEventListener('touchcancel', on(false), { passive: false });
  });

  // ---- 瞄準拖曳 (畫面空白處) ----
  let aimId = null, last = null, aimPx = { x: innerWidth / 2, y: innerHeight * 0.4 };
  window.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (t.target.closest && t.target.closest('#touch-ui')) continue;
      if (aimId === null) { aimId = t.identifier; last = { x: t.clientX, y: t.clientY }; }
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) moveStick(t);
      else if (t.identifier === aimId) {
        aimPx.x = Math.min(innerWidth, Math.max(0, aimPx.x + (t.clientX - last.x) * 1.4));
        aimPx.y = Math.min(innerHeight, Math.max(0, aimPx.y + (t.clientY - last.y) * 1.4));
        last = { x: t.clientX, y: t.clientY };
        setAimPx(aimPx.x, aimPx.y);
      }
    }
    e.preventDefault();
  }, { passive: false });

  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        stickId = null; state.stick.x = state.stick.y = 0;
        knob.style.transform = '';
      }
      if (t.identifier === aimId) aimId = null;
    }
  };
  window.addEventListener('touchend', end);
  window.addEventListener('touchcancel', end);
  return state;
}
