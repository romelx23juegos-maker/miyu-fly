const keys = new Set<string>();
const stick = { x: 0, y: 0 };
let btn = false;
const listeners: ((code: string) => void)[] = [];

addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (!e.repeat) listeners.forEach((f) => f(e.code));
  keys.add(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const down = (...c: string[]) => c.some((k) => keys.has(k));

// joystick virtual (táctil o ratón)
const stickEl = document.getElementById('stick')!, knob = document.getElementById('knob')!;
const setStick = (e: PointerEvent) => {
  const r = stickEl.getBoundingClientRect(), R = r.width / 2;
  let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
  const l = Math.hypot(dx, dy); if (l > R * .75) { dx *= R * .75 / l; dy *= R * .75 / l; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  stick.x = dx / (R * .75); stick.y = -dy / (R * .75);
};
stickEl.addEventListener('pointerdown', (e) => { stickEl.setPointerCapture(e.pointerId); setStick(e); });
stickEl.addEventListener('pointermove', (e) => { if (stickEl.hasPointerCapture(e.pointerId)) setStick(e); });
const release = () => { stick.x = stick.y = 0; knob.style.transform = ''; };
stickEl.addEventListener('pointerup', release); stickEl.addEventListener('pointercancel', release);

const boostEl = document.getElementById('boost')!;
boostEl.addEventListener('pointerdown', (e) => { boostEl.setPointerCapture(e.pointerId); btn = true; });
boostEl.addEventListener('pointerup', () => (btn = false)); boostEl.addEventListener('pointercancel', () => (btn = false));

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
export const input = {
  get x() { return clamp((down('ArrowRight', 'KeyD') ? 1 : 0) - (down('ArrowLeft', 'KeyA') ? 1 : 0) + stick.x); },
  get y() { return clamp((down('ArrowUp', 'KeyW') ? 1 : 0) - (down('ArrowDown', 'KeyS') ? 1 : 0) + stick.y); },
  get boost() { return down('Space', 'ShiftLeft', 'ShiftRight') || btn; },
};
export const onKey = (f: (code: string) => void) => listeners.push(f);
