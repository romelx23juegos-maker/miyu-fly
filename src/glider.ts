import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toon } from './theme';
import { OUTFITS, type Outfit } from './shop';

export interface Input { x: number; y: number; boost: boolean }

const tmp = new THREE.Vector3();

function canopyTexture(p: Outfit['canopy'] = OUTFITS[0].canopy) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = p.base; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = p.line; g.lineWidth = 3;
  for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(i * 51.2, 0); g.lineTo(i * 51.2, 256); g.stroke(); }
  g.fillStyle = p.band; g.fillRect(0, 214, 512, 42); // borde de ataque
  g.fillStyle = p.band2; g.fillRect(0, 0, 512, 22);
  const flower = (x: number, y: number, r: number) => {
    g.fillStyle = p.flower;
    for (let k = 0; k < 5; k++) {
      const a = k * Math.PI * 2 / 5; g.beginPath(); g.ellipse(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .5, r * .34, a, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(x, y, r * .22, 0, Math.PI * 2); g.fill();
  };
  for (const [x, y, r] of [[102, 110, 36], [256, 100, 42], [410, 112, 36], [180, 170, 22], [340, 170, 22], [40, 150, 20], [470, 150, 20]]) flower(x, y, r);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Glider {
  root = new THREE.Group();
  pos = new THREE.Vector3(); yaw = 0; pitch = -0.14; roll = 0; speed = 16;
  energy = 100; boosting = false;
  nozzles: THREE.Object3D[] = [];
  private locked = false;
  outfit: Outfit = OUTFITS[0];
  private wm!: THREE.MeshToonMaterial;
  private skinMats: THREE.MeshToonMaterial[] = [];
  /** Mejoras de vuelo: caída mínima, consumo y recarga de energía, velocidad de giro. */
  private mods = { sink: 0.8, burn: 32, regen: 11, turn: 1.05 };
  private glow: THREE.MeshBasicMaterial[] = [];
  private pilot = new THREE.Group();
  private canopy = new THREE.Group();
  private t = 0;
  private lastY = 0;
  private rig: { b: THREE.Bone; base: THREE.Quaternion; kind: string; side: number; idx: number; depth: number }[] = [];

  constructor(scene: THREE.Scene) {
    const mat = (c: string) => toon(c);
    const add = (geo: THREE.BufferGeometry, color: string, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
    };
    const limb = (a: THREE.Vector3, b: THREE.Vector3, r: number, color: string) => {
      const d = b.clone().sub(a), len = Math.max(0.01, d.length() - 2 * r);
      const m = add(new THREE.CapsuleGeometry(r, len, 4, 8), color, this.pilot);
      m.position.copy(a).addScaledVector(d, .5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    };

    // ---- parapente (mira hacia -Z)
    const R = 5.5, arc = 1.8;
    const wing = new THREE.CylinderGeometry(R, R, 3.4, 28, 1, true, Math.PI - arc / 2, arc).rotateX(Math.PI / 2);
    const wm = new THREE.MeshToonMaterial({ map: canopyTexture(), side: THREE.DoubleSide, gradientMap: (mat('#fff') as THREE.MeshToonMaterial).gradientMap });
    this.wm = wm;
    const wingMesh = new THREE.Mesh(wing, wm); wingMesh.position.y = -0.5 + 0; wingMesh.castShadow = true;
    this.canopy.add(wingMesh);
    const pts: number[] = [];
    for (const s of [-1, -.5, 0, .5, 1]) {
      const th = Math.PI + s * arc / 2, x = R * Math.sin(th), y = -R * Math.cos(th) - 0.5;
      for (const z of [-1.5, 1.5]) pts.push(x, y, z, x * 0.06, -4.3, z * 0.3);
    }
    const lg = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#4a4a58', transparent: true, opacity: .75 }));
    this.canopy.add(lines);
    this.canopy.position.y = 5.5; this.root.add(this.canopy);

    // ---- Miyu (boca abajo, vista desde atrás)
    this.root.add(this.pilot); this.pilot.scale.setScalar(1.5);
    add(new THREE.CapsuleGeometry(.34, .72, 4, 10).rotateX(Math.PI / 2), '#f2f5fb', this.pilot, 0, 0, 0);                // torso
    add(new THREE.BoxGeometry(.78, .5, .5), '#dfe6f3', this.pilot, 0, .42, -.05);                                       // mochila
    add(new THREE.BoxGeometry(.55, .22, .3), '#9a6cf0', this.pilot, 0, .6, -.05);
    add(new THREE.CylinderGeometry(.34, .5, .34, 14).rotateX(Math.PI / 2), '#2c3e7a', this.pilot, 0, .02, .66);         // falda
    for (const s of [-1, 1]) {
      const leg = add(new THREE.CapsuleGeometry(.1, .8, 4, 8).rotateX(Math.PI / 2), '#fff4ea', this.pilot, s * .24, -.12, 1.3);
      leg.rotation.x = -.18;
      add(new THREE.BoxGeometry(.22, .2, .5), '#5a3a2e', this.pilot, s * .24, -.3, 1.82);
      const jet = add(new THREE.CylinderGeometry(.17, .21, .62, 10).rotateX(Math.PI / 2), '#c9b8f5', this.pilot, s * .58, .28, .22);
      jet.castShadow = true; jet.userData.keep = true;
      const gm = new THREE.MeshBasicMaterial({ color: '#c58bff', transparent: true, opacity: .4 });
      this.glow.push(gm);
      const nz = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), gm); nz.position.set(s * .58, .28, .6); nz.userData.keep = true; this.pilot.add(nz); this.nozzles.push(nz);
      // brazos hacia las líneas
      limb(new THREE.Vector3(s * .36, .18, -.32), new THREE.Vector3(s * .62, .95, -.62), .09, '#f2f5fb');
      add(new THREE.SphereGeometry(.12, 8, 8), '#3d3d4a', this.pilot, s * .62, .98, -.63);
    }
    add(new THREE.SphereGeometry(.31, 16, 12), '#ffe0cc', this.pilot, 0, .12, -.9);                                     // cabeza
    const hair = add(new THREE.SphereGeometry(.355, 16, 12), '#7a4630', this.pilot, 0, .2, -.84); hair.scale.set(1, 1, .95);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(.15, 8, 8), '#7a4630', this.pilot, s * .3, 0, -.78);
    const cap = add(new THREE.SphereGeometry(.375, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#2a3a74', this.pilot, 0, .26, -.86);
    cap.rotation.x = -.25;
    add(new THREE.SphereGeometry(.07, 8, 8), '#ff8fb1', this.pilot, .27, .38, -.95);                                      // flor

    this.root.traverse((o) => { o.castShadow = true; });
    scene.add(this.root);
    void this.loadModel();
  }

  /** Sustituye a la Miyu procedural por el modelo de Meshy (rig Mixamo) con pose de vuelo. */
  private async loadModel() {
    let gltf;
    try { gltf = await new GLTFLoader().loadAsync('/assets/miyu.glb'); } catch (e) { console.warn('miyu.glb no cargó, uso modelo procedural', e); return; }
    const model = gltf.scene;
    model.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isMesh) return;
      const old = m.material as THREE.MeshStandardMaterial;
      const tm = toon(this.outfit.tint, { map: old.map, transparent: old.transparent, alphaTest: old.alphaTest, side: old.side, alphaMap: old.alphaMap });
      this.skinMats.push(tm); m.material = tm;
      m.castShadow = true; m.frustumCulled = false;
    });
    // el modelo trae un objeto (caja) pegado a la mano derecha: se eliminan sus fragmentos de malla
    model.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh || !m.geometry.index) return;
      const geo = m.geometry, idx = geo.index!.array, pos = geo.attributes.position, sk = geo.attributes.skinIndex;
      const names = m.skeleton.bones.map((b) => b.name), n = pos.count;
      const par = Int32Array.from({ length: n }, (_, i) => i);
      const find = (x: number) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
      for (let i = 0; i < idx.length; i += 3) { const a = find(idx[i]); par[find(idx[i + 1])] = a; par[find(idx[i + 2])] = a; }
      const comp = new Map<number, { n: number; minX: number; bones: Record<string, number> }>();
      for (let v = 0; v < n; v++) {
        const o2 = comp.get(find(v)) ?? { n: 0, minX: 1e9, bones: {} }; comp.set(find(v), o2);
        o2.n++; o2.minX = Math.min(o2.minX, pos.getX(v));
        const b = names[sk.getComponent(v, 0)]; o2.bones[b] = (o2.bones[b] ?? 0) + 1;
      }
      const kill = new Set<number>();
      comp.forEach((c, r) => { const top = Object.entries(c.bones).sort((a, b) => b[1] - a[1])[0][0]; if (top === 'mixamorigRightHand' && c.minX < -1.15 && c.n < 300) kill.add(r); });
      const keep: number[] = [];
      for (let i = 0; i < idx.length; i += 3) if (!kill.has(find(idx[i]))) keep.push(idx[i], idx[i + 1], idx[i + 2]);
      geo.setIndex(keep);
    });
    // quitar la Miyu procedural (se conservan jetpacks y toberas, más pequeños y pegados a la espalda)
    for (const c of [...this.pilot.children]) if (!c.userData.keep) this.pilot.remove(c);
    this.pilot.children.forEach((c, i) => {
      const sx = i < 2 ? -1 : 1, jet = i % 2 === 0;
      c.scale.setScalar(.55); c.position.set(sx * .3, .42, jet ? .1 : .42);
    });

    const holder = new THREE.Group(), inner = new THREE.Group();
    inner.add(model); inner.rotation.y = Math.PI;           // el modelo mira a +Z; el juego avanza hacia -Z
    holder.add(inner);
    this.pilot.add(holder);
    this.pilot.scale.setScalar(1);                           // medir y posar con escala 1; se restaura al final
    this.root.updateWorldMatrix(true, true);
    let h = 1.7;
    model.traverse((o) => { const m = o as THREE.SkinnedMesh; if (m.isSkinnedMesh) { m.geometry.computeBoundingBox(); h = m.geometry.boundingBox!.max.y - m.geometry.boundingBox!.min.y; } });
    model.scale.setScalar(1.75 / h);
    holder.rotation.x = -1.2;                                // boca abajo, cabeza hacia delante
    this.root.updateWorldMatrix(true, true);

    const bone = (n: string) => model.getObjectByName('mixamorig' + n) as THREE.Bone | undefined;
    const pilotDir = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize().transformDirection(this.pilot.matrixWorld);
    const wa = new THREE.Vector3(), wb = new THREE.Vector3(), q = new THREE.Quaternion(), pq = new THREE.Quaternion(), bq = new THREE.Quaternion();
    const aim = (b?: THREE.Bone, child?: THREE.Bone, dir?: THREE.Vector3) => {
      if (!b || !child || !dir || !b.parent) return;
      b.updateWorldMatrix(true, true);
      b.getWorldPosition(wa); child.getWorldPosition(wb);
      q.setFromUnitVectors(wb.sub(wa).normalize(), dir);
      b.getWorldQuaternion(bq); b.parent.getWorldQuaternion(pq);
      b.quaternion.copy(pq.invert().multiply(q).multiply(bq));
      b.updateWorldMatrix(true, true);
    };
    aim(bone('Neck'), bone('Head'), pilotDir(0, .8, -.6));
    aim(bone('Head'), bone('HeadTop_End'), pilotDir(0, .75, -.65));
    for (const side of ['Left', 'Right']) {
      const p = new THREE.Vector3(); bone(side + 'Arm')?.getWorldPosition(p); this.pilot.worldToLocal(p);
      const sx = p.x >= 0 ? 1 : -1;
      aim(bone(side + 'Arm'), bone(side + 'ForeArm'), pilotDir(sx * .35, .9, -.25));
      aim(bone(side + 'ForeArm'), bone(side + 'Hand'), pilotDir(sx * .25, .95, -.1));
      aim(bone(side + 'UpLeg'), bone(side + 'Leg'), pilotDir(sx * .12, -.1, 1));
      aim(bone(side + 'Leg'), bone(side + 'Foot'), pilotDir(sx * .08, -.45, .9));
      aim(bone(side + 'Foot'), bone(side + 'ToeBase'), pilotDir(0, -.4, .9));
    }
    // centrar el cuerpo bajo las líneas
    this.root.updateWorldMatrix(true, true);
    const c = new THREE.Vector3(); bone('Spine1')?.getWorldPosition(c);
    this.pilot.worldToLocal(c);
    holder.position.set(-c.x, -c.y + .1, -c.z - .1);
    this.pilot.scale.setScalar(1.5);

    // huesos que se animan cada frame (se guarda su pose base)
    const depth = (b: THREE.Object3D) => { let d = 0; for (let p = b.parent; p; p = p.parent) d++; return d; };
    const reg = (b: THREE.Bone | undefined, kind: string, side = 0, idx = 0) => {
      if (b) this.rig.push({ b, base: b.quaternion.clone(), kind, side, idx, depth: depth(b) });
    };
    reg(bone('Spine1'), 'spine'); reg(bone('Neck'), 'neck'); reg(bone('Head'), 'head');
    for (const side of ['Left', 'Right']) {
      const p = new THREE.Vector3(); bone(side + 'Arm')?.getWorldPosition(p); this.pilot.worldToLocal(p);
      const sx = p.x >= 0 ? 1 : -1;
      reg(bone(side + 'Arm'), 'arm', sx); reg(bone(side + 'ForeArm'), 'foreArm', sx);
      reg(bone(side + 'UpLeg'), 'upLeg', sx); reg(bone(side + 'Leg'), 'leg', sx); reg(bone(side + 'Foot'), 'foot', sx);
    }
    let k = 0;
    model.traverse((o) => { if ((o as THREE.Bone).isBone && /^Bone_/.test(o.name)) reg(o as THREE.Bone, 'sec', 0, k++); });
    this.rig.sort((a, b) => a.depth - b.depth);
  }

  private readonly AX = new THREE.Vector3(1, 0, 0);
  private readonly AY = new THREE.Vector3(0, 1, 0);
  private readonly AZ = new THREE.Vector3(0, 0, 1);

  /** Animación procedural de los huesos en el espacio de la piloto (X derecha, Y arriba, Z atrás). */
  private animate() {
    if (!this.rig.length) return;
    const t = this.t, turn = THREE.MathUtils.clamp(-this.roll / 0.6, -1, 1), sp = this.speed / 16;
    const boost = this.boosting ? 1 : 0, brake = Math.max(0, -this.lastY), dive = Math.max(0, this.lastY);
    const plq = new THREE.Quaternion(), pq = new THREE.Quaternion(), rel = new THREE.Quaternion();
    const R = new THREE.Quaternion(), tq = new THREE.Quaternion();
    this.pilot.updateWorldMatrix(true, true);
    for (const r of this.rig) {
      const s = r.side, parts: [THREE.Vector3, number][] = [];
      switch (r.kind) {
        case 'spine': parts.push([this.AZ, -turn * 0.12], [this.AX, -dive * 0.12 + brake * 0.1]); break;
        case 'neck': parts.push([this.AY, turn * 0.25]); break;
        case 'head': parts.push([this.AY, turn * 0.35 + Math.sin(t * 0.9) * 0.05], [this.AX, -0.08 + Math.sin(t * 1.3) * 0.03 + dive * 0.1]); break;
        case 'arm': parts.push([this.AX, Math.max(0, turn * s) * 0.45 + brake * 0.12 + Math.sin(t * 1.5 + s) * 0.04], [this.AZ, s * Math.sin(t * 1.2) * 0.03]); break;
        case 'foreArm': parts.push([this.AX, Math.max(0, turn * s) * 0.35]); break;
        case 'upLeg': parts.push([this.AX, Math.sin(t * 2 + s) * 0.1 * (1 - boost) - boost * 0.3 + brake * 0.3 - dive * 0.1], [this.AY, -s * boost * 0.08]); break;
        case 'leg': parts.push([this.AX, Math.sin(t * 2.3 + s + 1) * 0.12 * (1 - boost) + brake * 0.35]); break;
        case 'foot': parts.push([this.AX, Math.sin(t * 2.6 + s) * 0.15 - boost * 0.2]); break;
        default: parts.push([this.AX, Math.sin(t * 3 + r.idx) * 0.1 * sp + boost * 0.12], [this.AZ, -turn * 0.15 + Math.sin(t * 2.2 + r.idx) * 0.05]);
      }
      R.identity();
      for (const [ax, ang] of parts) R.premultiply(tq.setFromAxisAngle(ax, ang));
      this.pilot.getWorldQuaternion(plq); r.b.parent!.getWorldQuaternion(pq);
      rel.copy(plq).invert().multiply(pq);                   // orientación del padre en el espacio de la piloto
      r.b.quaternion.copy(rel).invert().multiply(R).multiply(rel).multiply(r.base);
      r.b.updateWorldMatrix(true, false);
    }
  }

  forward(out = new THREE.Vector3()) {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }

  reset(pos: THREE.Vector3, yaw: number) {
    this.pos.copy(pos); this.yaw = yaw; this.pitch = -0.14; this.roll = 0; this.speed = 16;
    this.energy = 100; this.boosting = false; this.locked = false; this.apply(0);
  }

  addEnergy(n: number) { this.energy = Math.min(100, this.energy + n); }

  /** Aplica un traje: tono de Miyu, diseño del parapente y color del jetpack. */
  setOutfit(o: Outfit) {
    this.outfit = o;
    this.wm.map?.dispose(); this.wm.map = canopyTexture(o.canopy); this.wm.needsUpdate = true;
    for (const m of this.skinMats) m.color.set(o.tint);
    for (const g of this.glow) g.color.set(o.glow);
  }

  /** Aplica los niveles de mejora (0 a 3) de planeo, impulso y agilidad. */
  setUpgrades(up: Record<string, number>) {
    const g = up.glide ?? 0, b = up.boost ?? 0, a = up.agil ?? 0;
    this.mods = { sink: 0.8 - 0.15 * g, burn: 32 - 3 * b, regen: 11 + 4 * b, turn: 1.05 * (1 + 0.12 * a) };
  }

  /** Vuelo suave sin control (pantalla de título). */
  idle(dt: number) { this.t += dt; this.lastY = 0; this.boosting = false; this.apply(dt); }

  update(dt: number, inp: Input) {
    this.t += dt; this.lastY = inp.y;
    const tp = inp.y >= 0 ? -0.14 - inp.y * 0.38 : -0.14 + -inp.y * 0.1;
    this.pitch += (tp - this.pitch) * (1 - Math.exp(-dt * 3));

    if (this.energy <= 0.5) this.locked = true;
    if (this.energy > 25) this.locked = false;
    this.boosting = inp.boost && !this.locked && this.energy > 0;
    this.energy = this.boosting ? Math.max(0, this.energy - this.mods.burn * dt) : Math.min(100, this.energy + (inp.boost ? 3 : this.mods.regen) * dt);

    const vT = 16 + (-this.pitch - 0.14) * 55 + (this.boosting ? 14 : 0);
    this.speed += (vT - this.speed) * (1 - Math.exp(-dt * 0.9));
    this.yaw -= inp.x * this.mods.turn * Math.sqrt(this.speed / 16) * dt;

    this.pos.addScaledVector(this.forward(tmp), this.speed * dt);
    this.pos.y += ((this.boosting ? 9 : 0) - this.mods.sink) * dt;
    this.roll += (-inp.x * 0.6 - this.roll) * (1 - Math.exp(-dt * 3.5));
    this.apply(dt);
  }

  private apply(_dt: number) {
    this.root.position.copy(this.pos);
    this.root.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');
    this.pilot.rotation.z = -this.roll * 0.35 + Math.sin(this.t * 1.7) * 0.03;
    this.pilot.rotation.x = Math.sin(this.t * 1.3) * 0.03;
    this.canopy.rotation.z = Math.sin(this.t * 1.1) * 0.02;
    this.canopy.scale.x = 1 + Math.sin(this.t * 2.3) * 0.008;
    for (const g of this.glow) g.opacity = this.boosting ? 1 : 0.35;
    this.animate();
  }
}
