import * as THREE from 'three';
import { softTexture, petalTexture } from './theme';

interface P { s: THREE.Sprite; life: number; max: number; vel: THREE.Vector3; size: number }

/** Estela del jetpack y destellos al cruzar aros. */
export class Trails {
  private pool: P[] = [];
  private i = 0;
  constructor(scene: THREE.Scene, n = 160) {
    for (let k = 0; k < n; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: '#c98bff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false; scene.add(s);
      this.pool.push({ s, life: 0, max: 1, vel: new THREE.Vector3(), size: 1 });
    }
  }
  emit(pos: THREE.Vector3, color: string, size = 1, life = 0.6, vel?: THREE.Vector3) {
    const p = this.pool[this.i++ % this.pool.length];
    p.s.position.copy(pos); (p.s.material as THREE.SpriteMaterial).color.set(color);
    p.life = p.max = life; p.size = size; p.vel.copy(vel ?? new THREE.Vector3()); p.s.visible = true;
  }
  burst(pos: THREE.Vector3, color: string, count = 30, speed = 16) {
    for (let k = 0; k < count; k++) {
      const v = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(speed * (.4 + Math.random() * .6));
      this.emit(pos, color, 1.4 + Math.random(), 0.8 + Math.random() * .4, v);
    }
  }
  update(dt: number) {
    for (const p of this.pool) {
      if (!p.s.visible) continue;
      p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; continue; }
      const k = p.life / p.max;
      p.s.position.addScaledVector(p.vel, dt); p.vel.multiplyScalar(1 - dt * 2);
      p.s.scale.setScalar(p.size * (0.5 + (1 - k) * 1.4));
      (p.s.material as THREE.SpriteMaterial).opacity = k * 0.9;
    }
  }
}

/** Pétalos de sakura cayendo alrededor del jugador. */
export class Petals {
  private pts: THREE.Points;
  private pos: Float32Array;
  private ph: Float32Array;
  private readonly n = 260; private readonly r = 70;
  constructor(scene: THREE.Scene) {
    this.pos = new Float32Array(this.n * 3); this.ph = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) {
      this.pos.set([(Math.random() - .5) * 2 * this.r, (Math.random() - .5) * 2 * this.r, (Math.random() - .5) * 2 * this.r], i * 3);
      this.ph[i] = Math.random() * 6.28;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ map: petalTexture(), size: 1.5, transparent: true, depthWrite: false, color: '#ffc4d6', alphaTest: .02 }));
    this.pts.frustumCulled = false; scene.add(this.pts);
  }
  update(dt: number, c: THREE.Vector3, t: number) {
    const R = this.r, a = this.pos;
    for (let i = 0; i < this.n; i++) {
      const k = i * 3;
      a[k] += Math.sin(t * .8 + this.ph[i]) * dt * 1.6 + dt * 1.2;
      a[k + 1] -= dt * 1.6;
      a[k + 2] += Math.cos(t * .7 + this.ph[i]) * dt * 1.6;
      for (let d = 0; d < 3; d++) {
        const dx = a[k + d] - c.getComponent(d);
        if (dx > R) a[k + d] -= 2 * R; else if (dx < -R) a[k + d] += 2 * R;
      }
    }
    this.pts.geometry.attributes.position.needsUpdate = true;
  }
}

/** Líneas de viento alrededor de la cámara; aparecen al ir rápido. */
export class WindLines {
  private seg: THREE.LineSegments;
  private pos: Float32Array;
  private local: THREE.Vector3[] = [];
  private readonly n = 70;
  constructor(scene: THREE.Scene) {
    this.pos = new Float32Array(this.n * 6);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.seg = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.seg.frustumCulled = false; scene.add(this.seg);
    for (let i = 0; i < this.n; i++) { const v = new THREE.Vector3(); this.respawn(v); v.z = -3 - Math.random() * 40; this.local.push(v); }
  }
  private respawn(v: THREE.Vector3) {
    const a = Math.random() * Math.PI * 2, r = 3.5 + Math.random() * 6;
    v.set(Math.cos(a) * r, Math.sin(a) * r * .7, -42);
  }
  update(dt: number, cam: THREE.Camera, speed: number) {
    const k = THREE.MathUtils.clamp((speed - 19) / 14, 0, 1);
    (this.seg.material as THREE.LineBasicMaterial).opacity = k * 0.45;
    this.seg.visible = k > 0.01;
    if (!this.seg.visible) return;
    cam.updateMatrixWorld();
    const len = 1.5 + speed * 0.12, a = new THREE.Vector3(), b = new THREE.Vector3();
    this.local.forEach((v, i) => {
      v.z += speed * dt * 1.1;
      if (v.z > -2.5) this.respawn(v);
      a.copy(v).applyMatrix4(cam.matrixWorld); b.set(v.x, v.y, v.z - len).applyMatrix4(cam.matrixWorld);
      this.pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
    });
    this.seg.geometry.attributes.position.needsUpdate = true;
  }
}
