import * as THREE from 'three';

const rampTex = new THREE.DataTexture(new Uint8Array([130, 130, 130, 255, 205, 205, 205, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
rampTex.minFilter = rampTex.magFilter = THREE.NearestFilter;
rampTex.needsUpdate = true;

export const toon = (color: THREE.ColorRepresentation, extra: THREE.MeshToonMaterialParameters = {}) =>
  new THREE.MeshToonMaterial({ color, gradientMap: rampTex, ...extra });

const cache: Record<string, THREE.CanvasTexture> = {};
function canvasTex(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  if (!cache[key]) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d')!, size);
    cache[key] = new THREE.CanvasTexture(c);
    cache[key].colorSpace = THREE.SRGBColorSpace;
  }
  return cache[key];
}

export const softTexture = () => canvasTex('soft', 64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});

export const starTexture = () => canvasTex('star', 128, (g, s) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,250,210,.9)'); gr.addColorStop(.25, 'rgba(255,240,170,.25)'); gr.addColorStop(1, 'rgba(255,240,170,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.fillStyle = '#fffbe0'; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 9 : 60; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
  g.closePath(); g.fill();
});

export const petalTexture = () => canvasTex('petal', 32, (g) => {
  g.translate(16, 16); g.rotate(0.6);
  const gr = g.createRadialGradient(0, 0, 1, 0, 0, 12);
  gr.addColorStop(0, '#ffe4ec'); gr.addColorStop(1, 'rgba(255,170,200,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2); g.fill();
});

export const waterTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#62c3e6'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.lineCap = 'round';
  for (let k = 0; k < 7; k++) {
    const y = (k + .5) * 128 / 7, x0 = (k * 37) % 128;
    for (const o of [0, -128]) {
      g.beginPath(); g.moveTo(x0 + o, y); g.bezierCurveTo(x0 + o + 10, y - 5, x0 + o + 20, y + 5, x0 + o + 32, y); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
