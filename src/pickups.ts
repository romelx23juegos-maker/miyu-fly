import * as THREE from 'three';
import { toon } from './theme';

// Dulces (dango) flotando en la ruta: recargan energía del jetpack y dan pétalos.
const COLORS = ['#ff9fc4', '#fff6ea', '#9be08a'];
const RANGE = 4;

interface Candy { home: THREE.Vector3; group: THREE.Group; taken: boolean }

export class Candies {
  list: Candy[] = [];
  private t = 0;
  constructor(private scene: THREE.Scene) {}

  /** Coloca un dango en cada punto (sustituye a los anteriores). */
  load(points: THREE.Vector3[]) {
    for (const c of this.list) this.scene.remove(c.group);
    this.list = points.map((p) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.8, 6), toon('#b07a4a')));
      COLORS.forEach((color, i) => {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(.38, 14, 10), toon(color));
        ball.position.y = -.5 + i * .5; ball.castShadow = true; g.add(ball);
      });
      g.position.copy(p); this.scene.add(g);
      return { home: p.clone(), group: g, taken: false };
    });
  }

  /** Vuelve a mostrar todos los dulces (al reiniciar la misión). */
  reset() { for (const c of this.list) { c.taken = false; c.group.visible = true; } }

  /** Devuelve cuántos dulces se recogieron este frame. */
  update(dt: number, player: THREE.Vector3): number {
    this.t += dt; let got = 0;
    for (const c of this.list) {
      if (c.taken) continue;
      c.group.rotation.y += dt * 1.5;
      c.group.position.y = c.home.y + Math.sin(this.t * 2 + c.home.x) * .4;
      if (c.group.position.distanceTo(player) < RANGE) { c.taken = true; c.group.visible = false; got++; }
    }
    return got;
  }
}
