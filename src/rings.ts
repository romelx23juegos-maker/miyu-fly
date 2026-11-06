import * as THREE from 'three';
import { starTexture } from './theme';
import type { Mission } from './missions';

// Halo en forma de anillo que siempre mira a la cámara: así el aro se ve también de frente,
// cuando el toro (perpendicular a la ruta) quedaría de canto.
let ringGlowTex: THREE.CanvasTexture | undefined;
function ringGlow() {
  if (!ringGlowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(64, 64, 26, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,220,120,0)'); gr.addColorStop(.45, 'rgba(255,236,150,.9)');
    gr.addColorStop(.55, 'rgba(255,236,150,.9)'); gr.addColorStop(1, 'rgba(255,220,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    ringGlowTex = new THREE.CanvasTexture(c);
  }
  return ringGlowTex;
}

class Ring {
  group = new THREE.Group();
  c: THREE.Vector3; n = new THREE.Vector3();
  torus: THREE.Mesh; halo: THREE.Mesh; glow: THREE.Sprite; sparks: THREE.Sprite[] = [];
  burst = 0;
  constructor(scene: THREE.Scene, c: THREE.Vector3, dir: THREE.Vector3, public r: number) {
    this.c = c.clone(); this.n.copy(dir).normalize();
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringGlow(), color: '#ffd24a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.glow.scale.setScalar(r * 2.6); this.group.add(this.glow);
    this.torus = new THREE.Mesh(new THREE.TorusGeometry(r, .55 * Math.max(.7, r / 7.5), 12, 56), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, fog: false }));
    this.halo = new THREE.Mesh(new THREE.TorusGeometry(r, 1.5 * Math.max(.7, r / 7.5), 10, 56), new THREE.MeshBasicMaterial({ color: '#ffe48a', transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.group.add(this.torus, this.halo);
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
      s.scale.setScalar(2 * Math.max(.7, r / 7.5)); s.userData.a = i / 10 * Math.PI * 2; this.group.add(s); this.sparks.push(s);
    }
    this.group.position.copy(c); this.group.lookAt(c.clone().add(this.n)); scene.add(this.group);
  }
  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
  }
}

export class Course {
  rings: Ring[] = [];
  next = 0;
  private t = 0;
  private start = new THREE.Vector3();
  constructor(private scene: THREE.Scene, mission: Mission) { this.load(mission); }

  /** Sustituye los aros por los de otra misión. */
  load(m: Mission) {
    for (const r of this.rings) r.dispose(this.scene);
    this.rings = []; this.start.copy(m.start);
    const pts = [m.start.clone(), ...m.pts.map((p) => new THREE.Vector3(...p))];
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], nxt = pts[i + 1] ?? pts[i].clone().add(pts[i].clone().sub(prev));
      this.rings.push(new Ring(this.scene, pts[i], nxt.clone().sub(prev), m.ringR));
    }
    this.reset();
  }
  get total() { return this.rings.length; }
  get done() { return this.next >= this.rings.length; }
  get target() { return this.rings[Math.min(this.next, this.rings.length - 1)].c; }
  reset() { this.next = 0; for (const r of this.rings) { r.burst = 0; r.group.visible = true; r.group.scale.setScalar(1); } }

  /** Devuelve el índice del aro cruzado en este frame, o -1. */
  update(dt: number, p: THREE.Vector3, prev: THREE.Vector3): number {
    this.t += dt;
    let passed = -1;
    if (!this.done) {
      const r = this.rings[this.next];
      const d0 = prev.clone().sub(r.c).dot(r.n), d1 = p.clone().sub(r.c).dot(r.n);
      if (d0 !== d1 && d0 * d1 <= 0) {
        const q = prev.clone().lerp(p, d0 / (d0 - d1));
        if (q.distanceTo(r.c) < r.r + .8) { passed = this.next; r.burst = .6; this.next++; }
      }
    }
    this.rings.forEach((r, i) => {
      const tm = r.torus.material as THREE.MeshBasicMaterial, hm = r.halo.material as THREE.MeshBasicMaterial;
      if (i < this.next) {
        if (r.burst > 0) {
          r.burst -= dt; r.group.scale.addScalar(dt * 3); tm.opacity = Math.max(0, r.burst / .6); hm.opacity = tm.opacity * .25;
          (r.glow.material as THREE.SpriteMaterial).opacity = tm.opacity * .8;
          if (r.burst <= 0) r.group.visible = false;
        }
        return;
      }
      const isNext = i === this.next, k = i - this.next;
      r.group.scale.setScalar(isNext ? 1 + Math.sin(this.t * 4) * .04 : .72);
      tm.opacity = isNext ? 1 : Math.max(.22, .6 - .14 * (k - 1));
      hm.opacity = isNext ? .3 + Math.sin(this.t * 4) * .1 : .1;
      (r.glow.material as THREE.SpriteMaterial).opacity = isNext ? .95 : Math.max(.35, .6 - .1 * (k - 1));
      r.sparks.forEach((s) => {
        const a = s.userData.a + this.t * (isNext ? .8 : .3);
        s.position.set(Math.cos(a) * r.r, Math.sin(a) * r.r, 0);
        (s.material as THREE.SpriteMaterial).opacity = (isNext ? .9 : .4) * (.6 + .4 * Math.sin(this.t * 5 + s.userData.a * 3));
      });
    });
    return passed;
  }
  /** Dirección inicial recomendada (hacia el primer aro). */
  startYaw() { const d = this.rings[0].c.clone().sub(this.start); return Math.atan2(-d.x, -d.z); }
}
