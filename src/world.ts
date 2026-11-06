import * as THREE from 'three';
import { toon, waterTexture } from './theme';

export const CELL = 12, N = 19;
export const riverX = (z: number) => -18 + 0.255 * z;
export const TEMPLE = new THREE.Vector3(-156, 0, -185);
export const START = new THREE.Vector3(200, 100, 212);

interface Box { x0: number; x1: number; z0: number; z1: number; top: number }
type Item = { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry?: number; color: string };

let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (a: string[]) => a[(rnd() * a.length) | 0];

export function buildWorld(scene: THREE.Scene) {
  const grid = new Map<number, Box>();
  const extra: Box[] = [];
  const key = (i: number, j: number) => (i + 100) * 1000 + (j + 100);

  scene.fog = new THREE.Fog('#f6e6cf', 160, 760);

  // ---- cielo
  const sunDir = new THREE.Vector3(0.45, 0.55, -0.35).normalize();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#5fb4ec') }, bot: { value: new THREE.Color('#fdebd2') }, sunDir: { value: sunDir } },
    vertexShader: 'varying vec3 vd;void main(){vd=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform vec3 top,bot,sunDir;varying vec3 vd;void main(){vec3 d=normalize(vd);float h=d.y;
      vec3 c=mix(bot,top,smoothstep(0.0,0.5,h));float s=max(dot(d,sunDir),0.);
      c+=vec3(1.,.86,.6)*(pow(s,90.)*.9+pow(s,5.)*.12);gl_FragColor=vec4(c,1.);}`,
  }));
  sky.renderOrder = -10; scene.add(sky);

  // ---- luces
  scene.add(new THREE.HemisphereLight('#c4e4ff', '#f0d8a8', 1.25));
  const sun = new THREE.DirectionalLight('#fff0cf', 2.4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004;
  Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, near: 10, far: 600 });
  scene.add(sun, sun.target);

  // ---- suelo, calles, río, lago
  const ground = new THREE.Mesh(new THREE.CircleGeometry(4000, 48), toon('#a8d28c'));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const streets = new THREE.Mesh(new THREE.PlaneGeometry(CELL * (2 * N + 2) + 20, CELL * (2 * N + 2) + 20), toon('#eadcbc'));
  streets.rotation.x = -Math.PI / 2; streets.position.y = 0.03; streets.receiveShadow = true; scene.add(streets);

  const wTex = waterTexture(); wTex.repeat.set(3, 150);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(16, 1400), new THREE.MeshBasicMaterial({ map: wTex }));
  river.rotation.set(-Math.PI / 2, 0, 0.25); river.position.set(-18, 0.06, 0); scene.add(river);
  const lTex = waterTexture(); lTex.repeat.set(40, 40);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(300, 40), new THREE.MeshBasicMaterial({ map: lTex }));
  lake.rotation.x = -Math.PI / 2; lake.position.set(-520, 0.05, -80); scene.add(lake);

  // ---- instancias
  const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, items: Item[], cast = true) => {
    if (!items.length) return;
    const m = new THREE.InstancedMesh(geo, mat, items.length);
    const d = new THREE.Object3D(), c = new THREE.Color();
    items.forEach((it, i) => {
      d.position.set(it.x, it.y, it.z); d.scale.set(it.sx, it.sy, it.sz); d.rotation.set(0, it.ry ?? 0, 0); d.updateMatrix();
      m.setMatrixAt(i, d.matrix); m.setColorAt(i, c.set(it.color));
    });
    m.castShadow = cast; m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
  };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
  const coneGeo = new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4).translate(0, .5, 0);
  const trunkGeo = new THREE.CylinderGeometry(.45, .7, 1, 6).translate(0, .5, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1, 1);
  const white = toon('#ffffff');

  const walls = ['#f6e7cf', '#f2d6b3', '#fbf3e2', '#e9c9a0', '#efe0c4'];
  const roofs = ['#6b7fa3', '#8a5a4a', '#5f7f78', '#a65e56', '#4f5f86'];
  const sakura = ['#f8b4cc', '#f6a5c0', '#fbc9d8', '#f4b0c8'], greens = ['#8ec07a', '#79b36a', '#9ccc86'];

  const W: Item[] = [], R: Item[] = [], T: Item[] = [], C: Item[] = [];
  const nearTemple = (x: number, z: number, r: number) => Math.hypot(x - TEMPLE.x, z - TEMPLE.z) < r;
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
    const x = i * CELL, z = j * CELL;
    if (Math.abs(x - riverX(z)) * 0.97 < 13 || nearTemple(x, z, 40)) continue;
    const roll = rnd(), rr = Math.hypot(x, z);
    if (roll < 0.18) { // árbol
      const r = 2.8 + rnd() * 1.6, th = 3 + rnd() * 1.5, tx = x + (rnd() - .5) * 3, tz = z + (rnd() - .5) * 3;
      T.push({ x: tx, y: 0, z: tz, sx: 1, sy: th, sz: 1, color: '#7a5545' });
      C.push({ x: tx, y: th + r * .6, z: tz, sx: r, sy: r * .85, sz: r, color: rnd() < .7 ? pick(sakura) : pick(greens) });
      grid.set(key(i, j), { x0: tx - r * .8, x1: tx + r * .8, z0: tz - r * .8, z1: tz + r * .8, top: th + r * 1.5 });
      continue;
    }
    if (roll < 0.23) continue;
    const w = 6 + rnd() * 3.5, d = 6 + rnd() * 3.5;
    const h = 5 + rnd() * 6 + (rr < 95 && rnd() < .35 ? rnd() * 30 : 0), rh = 2.5 + rnd() * 2.5;
    const bx = x + (rnd() - .5) * 2, bz = z + (rnd() - .5) * 2, ro = Math.max(w, d) * .8;
    W.push({ x: bx, y: 0, z: bz, sx: w, sy: h, sz: d, color: pick(walls) });
    R.push({ x: bx, y: h, z: bz, sx: ro, sy: rh, sz: ro, color: pick(roofs) });
    grid.set(key(i, j), { x0: bx - ro, x1: bx + ro, z0: bz - ro, z1: bz + ro, top: h + rh });
  }
  // árboles fuera de la ciudad
  for (let k = 0; k < 700; k++) {
    const a = rnd() * Math.PI * 2, d = 270 + rnd() * 650, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.hypot(x + 520, z + 80) < 320) continue;
    const r = 4 + rnd() * 3;
    T.push({ x, y: 0, z, sx: 1.4, sy: 4, sz: 1.4, color: '#7a5545' });
    C.push({ x, y: 4 + r * .6, z, sx: r, sy: r * .85, sz: r, color: rnd() < .35 ? pick(sakura) : pick(greens) });
  }
  // árboles alrededor del templo
  for (let k = 0; k < 14; k++) {
    const a = rnd() * Math.PI * 2, d = 32 + rnd() * 14, x = TEMPLE.x + Math.cos(a) * d, z = TEMPLE.z + Math.sin(a) * d, r = 3.5 + rnd() * 1.5;
    T.push({ x, y: 0, z, sx: 1, sy: 4, sz: 1, color: '#7a5545' });
    C.push({ x, y: 4 + r * .6, z, sx: r, sy: r * .85, sz: r, color: pick(sakura) });
  }
  inst(boxGeo, white, W); inst(coneGeo, white, R); inst(trunkGeo, white, T); inst(crownGeo, white, C);

  // colinas lejanas
  const hills: Item[] = [];
  for (let k = 0; k < 16; k++) {
    const a = rnd() * Math.PI * 2, d = 500 + rnd() * 900, s = 120 + rnd() * 160;
    hills.push({ x: Math.cos(a) * d, y: -s * .2, z: Math.sin(a) * d, sx: s, sy: s * (.28 + rnd() * .2), sz: s, color: pick(['#8cc477', '#7fb86b', '#97cb82']) });
  }
  inst(new THREE.SphereGeometry(1, 20, 10), white, hills, false);

  // ---- monumentos
  const mesh = (geo: THREE.BufferGeometry, color: string, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, toon(color)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };

  // pagoda / templo
  const pagoda = new THREE.Group(); pagoda.position.set(TEMPLE.x, 0, TEMPLE.z); scene.add(pagoda);
  mesh(new THREE.BoxGeometry(28, 1.2, 28), '#d9cdb6', pagoda, 0, .6, 0);
  let py = 1.2;
  for (let k = 0; k < 5; k++) {
    const w = 14 - k * 2.2;
    mesh(new THREE.BoxGeometry(w, 4.2, w), '#c4443a', pagoda, 0, py + 2.1, 0); py += 4.2;
    const roof = new THREE.ConeGeometry(w * .98, 2.4, 4).rotateY(Math.PI / 4);
    mesh(roof, '#46577a', pagoda, 0, py + 1.2, 0); py += 1.9;
  }
  mesh(new THREE.CylinderGeometry(.25, .25, 7, 6), '#e8c14a', pagoda, 0, py + 3.5, 0);
  mesh(new THREE.SphereGeometry(.7, 10, 8), '#e8c14a', pagoda, 0, py + 5, 0);
  extra.push({ x0: TEMPLE.x - 8, x1: TEMPLE.x + 8, z0: TEMPLE.z - 8, z1: TEMPLE.z + 8, top: py + 8 });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(36, 32), toon('#ddd0b5'));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(TEMPLE.x, .05, TEMPLE.z); plaza.receiveShadow = true; scene.add(plaza);

  const torii = (x: number, z: number, ry: number) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(.5, .6, 9, 8), '#d2402f', g, s * 4.2, 4.5, 0);
    mesh(new THREE.BoxGeometry(12, .55, .8), '#d2402f', g, 0, 6.8, 0);
    mesh(new THREE.BoxGeometry(13.5, .6, 1.2), '#2b2b33', g, 0, 9.2, 0);
    mesh(new THREE.BoxGeometry(11, .8, 1.1), '#d2402f', g, 0, 8.7, 0);
  };
  const toS = Math.atan2(START.x - TEMPLE.x, START.z - TEMPLE.z);
  torii(TEMPLE.x + Math.sin(toS) * 40, TEMPLE.z + Math.cos(toS) * 40, toS);
  torii(TEMPLE.x + Math.sin(toS) * 62, TEMPLE.z + Math.cos(toS) * 62, toS);

  // puentes
  for (const bz of [-60, 40, 140]) {
    const g = new THREE.Group(); g.position.set(riverX(bz), 0, bz); g.rotation.y = 0.25; scene.add(g);
    const pts: [number, number][] = [];
    for (let k = 0; k <= 8; k++) { const t = k / 4 - 1; pts.push([t * 11, 2.4 * (1 - t * t)]); }
    for (let k = 0; k < 8; k++) {
      const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], len = Math.hypot(x1 - x0, y1 - y0) + .2, ang = Math.atan2(y1 - y0, x1 - x0);
      const deck = mesh(new THREE.BoxGeometry(len, .5, 4), '#a8553d', g, (x0 + x1) / 2, (y0 + y1) / 2 + 0.2, 0); deck.rotation.z = ang;
      for (const s of [-1, 1]) { const r = mesh(new THREE.BoxGeometry(len, .25, .25), '#c4443a', g, (x0 + x1) / 2, (y0 + y1) / 2 + 1.3, s * 1.9); r.rotation.z = ang; }
    }
    for (let k = 0; k <= 8; k += 2) for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(.25, 1.1, .25), '#c4443a', g, pts[k][0], pts[k][1] + .75, s * 1.9);
  }

  // castillo en la colina
  const cx = -30, cz = -340;
  const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), toon('#86b872')); hill.scale.set(85, 40, 85); hill.position.set(cx, -6, cz);
  hill.castShadow = hill.receiveShadow = true; scene.add(hill);
  const castle = new THREE.Group(); castle.position.set(cx, 30, cz); scene.add(castle);
  let cy = 0;
  [34, 26, 19, 13].forEach((w) => {
    mesh(new THREE.BoxGeometry(w, 9, w * .8), '#f6f1e6', castle, 0, cy + 4.5, 0); cy += 9;
    const roof = new THREE.ConeGeometry(w * .82, 4.5, 4).rotateY(Math.PI / 4); roof.scale(1, 1, .85);
    mesh(roof, '#44557a', castle, 0, cy + 2.2, 0); cy += 3.4;
  });
  mesh(new THREE.ConeGeometry(.6, 4, 6), '#e8c14a', castle, 0, cy + 3, 0);
  extra.push({ x0: cx - 55, x1: cx + 55, z0: cz - 55, z1: cz + 55, top: 26 }, { x0: cx - 17, x1: cx + 17, z0: cz - 14, z1: cz + 14, top: 75 });

  // monte Fuji
  const R0 = 430, H = 500, fg = new THREE.ConeGeometry(R0, H, 72, 28, true);
  const pos = fg.attributes.position, col = new Float32Array(pos.count * 3), cc = new THREE.Color(), tint = new THREE.Color('#a9b9de');
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(.985, (pos.getY(i) + H / 2) / H), ang = Math.atan2(pos.getZ(i), pos.getX(i));
    const r = R0 * (1 - Math.pow(t, 1.6)) * (1 + .035 * Math.sin(ang * 9 + t * 5));
    pos.setX(i, Math.cos(ang) * r); pos.setZ(i, Math.sin(ang) * r);
    const snow = .66 + .06 * Math.sin(ang * 7) + .035 * Math.sin(ang * 19);
    cc.set(t > snow ? '#fbfbff' : t > .35 ? '#7f93c6' : '#7aa88f');
    if (t <= snow) cc.lerp(tint, .15 + .3 * Math.max(0, Math.sin(ang * 5)));
    col.set([cc.r, cc.g, cc.b], i * 3);
  }
  fg.setAttribute('color', new THREE.BufferAttribute(col, 3)); fg.computeVertexNormals();
  const fuji = new THREE.Mesh(fg, toon('#ffffff', { vertexColors: true, fog: false }));
  fuji.position.set(-1050, H / 2 - 4, -1100); scene.add(fuji);

  // nubes
  const clouds: THREE.Group[] = [];
  const cm = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), cg = new THREE.SphereGeometry(1, 14, 10);
  for (let i = 0; i < 26; i++) {
    const g = new THREE.Group(), n = 4 + ((rnd() * 4) | 0);
    for (let j = 0; j < n; j++) {
      const s = new THREE.Mesh(cg, cm), r = 9 + rnd() * 12;
      s.scale.set(r, r * .6, r * .8); s.position.set((j - n / 2) * 13, rnd() * 5, (rnd() - .5) * 10); g.add(s);
    }
    g.position.set((rnd() - .5) * 2600, 190 + rnd() * 120, (rnd() - .5) * 2600); scene.add(g); clouds.push(g);
  }

  // ---- API
  const hit = (b: Box, p: THREE.Vector3, r: number) =>
    p.y < b.top + r && p.x > b.x0 - r && p.x < b.x1 + r && p.z > b.z0 - r && p.z < b.z1 + r;
  const collide = (p: THREE.Vector3, r: number) => {
    if (p.y < 1.6) return true;
    const ci = Math.round(p.x / CELL), cj = Math.round(p.z / CELL);
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
      const b = grid.get(key(i, j));
      if (b && hit(b, p, r)) return true;
    }
    return extra.some((b) => hit(b, p, r));
  };
  const update = (dt: number, player: THREE.Vector3, cam: THREE.Camera) => {
    sky.position.copy(cam.position);
    sun.position.copy(player).addScaledVector(sunDir, 250); sun.target.position.copy(player);
    wTex.offset.y -= dt * 0.04; lTex.offset.y -= dt * 0.01;
    for (const c of clouds) { c.position.x += dt * 3; if (c.position.x > 1400) c.position.x = -1400; }
  };
  return { collide, update };
}
