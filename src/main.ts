import * as THREE from 'three';
import { buildWorld } from './world';
import { Glider } from './glider';
import { Course } from './rings';
import { MISSIONS, type Mission } from './missions';
import { Trails, Petals, WindLines } from './fx';
import { hud, el } from './hud';
import { input, onKey } from './input';
import { audio } from './audio';
import { story, STORY } from './story';
import { renderShop, outfitOf } from './shop';
import { Candies } from './pickups';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const PENALTY = 3;

// progreso del jugador (guardado local)
interface Save {
  level: number; xp: number; best: Record<string, number>; seen: Record<string, boolean>; last?: string;
  petals: number; outfit: string; owned: string[]; up: Record<string, number>;
}
const save: Save = {
  level: 5, xp: 30, best: {}, seen: {}, petals: 0, outfit: 'clasico', owned: ['clasico'], up: {},
  ...JSON.parse(localStorage.getItem('miyu') ?? '{}'),
};
const persist = () => localStorage.setItem('miyu', JSON.stringify(save));
let mission: Mission = MISSIONS.find((m) => m.id === save.last) ?? MISSIONS[0];

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.3, 4500);
const world = buildWorld(scene);
const glider = new Glider(scene);
glider.setOutfit(outfitOf(save.outfit)); glider.setUpgrades(save.up);
const course = new Course(scene, mission);
const trails = new Trails(scene);
const petals = new Petals(scene);
const wind = new WindLines(scene);
const candies = new Candies(scene);

// post-proceso: brillo suave en aros, sol y estelas (con MSAA para no perder suavizado de bordes)
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(Math.min(devicePixelRatio, 2));
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.7, 0.85));
composer.addPass(new OutputPass());

type State = 'menu' | 'story' | 'playing' | 'paused' | 'done';
let state: State = 'menu';
let time = 0, camYaw = 0, checkpoint = mission.start.clone(), cpYaw = 0, lowWarned = false, timeWarned = false, t = 0;
const prev = new THREE.Vector3(), fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
const camLook = new THREE.Vector3();

const showXp = () => { hud.xp(save.level, save.xp / 100); hud.petals(save.petals); };
const earn = (n: number) => { save.petals += n; persist(); hud.petals(save.petals); };

function openShop() {
  state = 'menu'; audio.hush();
  renderShop(save, () => { persist(); glider.setOutfit(outfitOf(save.outfit)); glider.setUpgrades(save.up); hud.petals(save.petals); });
  hud.screen('shop');
}
const addXp = (n: number) => {
  save.xp += n; while (save.xp >= 100) { save.xp -= 100; save.level++; hud.say(`¡Subí al nivel ${save.level}!`); }
  persist(); showXp();
};

function reset() {
  course.reset();
  cpYaw = course.startYaw(); checkpoint = mission.start.clone();
  glider.reset(mission.start, cpYaw); camYaw = cpYaw;
  time = 0; lowWarned = false; timeWarned = false; prev.copy(mission.start); candies.reset();
  hud.time(0); hud.rings(0, course.total); showXp();
  hud.mission(mission.name, `Cruza los ${course.total} aros en menos de ${mission.limit} s`);
}

function start() {
  audio.init(); reset(); state = 'playing'; hud.screen(null);
  followCamera(0.016, true);
  hud.say(mission.intro, 6000);
}

/** Cambia de misión y deja a Miyu lista en el punto de salida. */
function selectMission(m: Mission) {
  mission = m; save.last = m.id; persist();
  course.load(m);
  // un dango a mitad de cada tramo entre aros
  const pts = [m.start.clone(), ...m.pts.map((p) => new THREE.Vector3(...p))];
  candies.load(pts.slice(1).map((p, i) => pts[i].clone().lerp(p, .5)));
  reset();
}
const unlocked = (m: Mission) => { const k = MISSIONS.indexOf(m); return k === 0 || (save.best[MISSIONS[k - 1].id] ?? 0) >= 1; };

/** Empieza una misión: primero la escena de historia (solo la primera vez) y luego el vuelo. */
function launch(m: Mission) {
  selectMission(m);
  const ch = STORY[m.id];
  if (ch && !save.seen[m.id]) {
    state = 'story'; hud.screen(null); audio.init();
    story.play(ch.intro, () => { save.seen[m.id] = true; persist(); start(); });
  } else start();
}
function openMissions() {
  state = 'menu'; audio.hush(); reset();
  hud.missionList(MISSIONS.map((m, k) => ({
    id: m.id, name: m.name, blurb: m.blurb, limit: m.limit, stars: save.best[m.id] ?? 0,
    lock: unlocked(m) ? undefined : `Completa «${MISSIONS[k - 1].name}» para desbloquearla`,
  })), mission.id, (id) => launch(MISSIONS.find((x) => x.id === id)!));
  hud.screen('missions');
}

function crash() {
  hud.flash('#ffd6e3'); time += PENALTY; audio.crash(); trails.burst(glider.pos, '#ffb3cc', 30, 12);
  const back = course.next > 0 ? course.rings[course.next - 1].c : mission.start;
  checkpoint = back.clone(); checkpoint.y = Math.max(checkpoint.y, 75);
  const d = course.target.clone().sub(checkpoint); cpYaw = Math.atan2(-d.x, -d.z);
  glider.reset(checkpoint, cpYaw); camYaw = cpYaw; prev.copy(checkpoint);
  hud.say('¡Ay! Volvamos a intentarlo (+3 s).', 3500);
}

function finish() {
  state = 'done'; audio.hush(); setTimeout(() => audio.victory(), 500);
  const win = course.done && time <= mission.limit * 1.5;
  const stars = !course.done ? 0 : time <= mission.threeStar ? 3 : time <= mission.limit ? 2 : 1;
  const first = course.done && (save.best[mission.id] ?? 0) === 0, ch = STORY[mission.id];
  save.best[mission.id] = Math.max(save.best[mission.id] ?? 0, stars);
  addXp(20 + stars * 10);
  hud.say(mission.done, 5000);
  const hasNext = MISSIONS.indexOf(mission) < MISSIONS.length - 1;
  el('nextBtn').style.display = hasNext ? '' : 'none';
  const gain = course.done ? stars * 10 + (first ? 20 : 0) : 0;
  earn(gain);
  const note = [first && ch ? `Nuevo: ${ch.stamp}` : '', gain ? `+${gain} 🌸` : ''].filter(Boolean).join(' · ');
  const showResults = () => hud.results(stars, time, course.next, course.total, win, note || undefined);
  setTimeout(() => (first && ch ? story.play(ch.outro, showResults) : showResults()), 1400);
}

function pause(on: boolean) {
  if (state === 'playing' && on) { state = 'paused'; hud.screen('pauseScr'); audio.pause(true); }
  else if (state === 'paused' && !on) { state = 'playing'; hud.screen(null); audio.pause(false); }
}
el('goBtn').onclick = () => launch(unlocked(mission) ? mission : MISSIONS[0]); el('againBtn').onclick = start;
el('pause').onclick = () => pause(true); el('resBtn').onclick = () => pause(false);
el('rstBtn').onclick = start;
el('misBtn').onclick = openMissions; el('menuBtn').onclick = openMissions; el('resMenuBtn').onclick = openMissions;
el('backBtn').onclick = () => { reset(); hud.screen('title'); };
el('shopBtn').onclick = openShop; el('shopBtn2').onclick = openShop; el('shopBack').onclick = () => hud.screen('title');
el('nextBtn').onclick = () => launch(MISSIONS[Math.min(MISSIONS.length - 1, MISSIONS.indexOf(mission) + 1)]);
onKey((c) => {
  if (story.active) { if (c === 'Enter' || c === 'Space') story.advance(); else if (c === 'Escape') story.skip(); return; }
  if (c === 'KeyP' || c === 'Escape') pause(state === 'playing');
  if (c === 'KeyM') hud.say(audio.toggleMute() ? 'Sonido desactivado (M)' : 'Sonido activado (M)', 1500);
  if ((c === 'Enter' || c === 'Space') && state === 'menu') launch(unlocked(mission) ? mission : MISSIONS[0]);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });

function followCamera(dt: number, snap = false) {
  const dy = Math.atan2(Math.sin(glider.yaw - camYaw), Math.cos(glider.yaw - camYaw));
  camYaw += dy * (snap ? 1 : 1 - Math.exp(-dt * 3));
  const dist = 10 + (glider.speed - 16) * 0.05;
  const want = tmp.set(Math.sin(camYaw) * dist, 2.6 - glider.pitch * 6, Math.cos(camYaw) * dist).add(glider.pos);
  camera.position.lerp(want, snap ? 1 : 1 - Math.exp(-dt * 5));
  glider.forward(fwd);
  camLook.lerp(tmp.copy(glider.pos).addScaledVector(fwd, 6).add(new THREE.Vector3(0, 1.5, 0)), snap ? 1 : 1 - Math.exp(-dt * 7));
  camera.lookAt(camLook);
  if (glider.boosting) camera.rotateZ(Math.sin(t * 55) * 0.004);       // temblor leve con el impulso
  const fov = 58 + (glider.speed - 16) * 0.35 + (glider.boosting ? 4 : 0);
  camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 3)); camera.updateProjectionMatrix();
}

function updateMarker() {
  if (course.done || state === 'menu') return hud.hideMarker();
  const target = course.target, toT = tmp.copy(target).sub(camera.position);
  const dist = target.distanceTo(glider.pos), front = toT.dot(camera.getWorldDirection(new THREE.Vector3())) > 0;
  const ndc = target.clone().project(camera);
  const onScreen = front && Math.abs(ndc.x) < .92 && Math.abs(ndc.y) < .85;
  const W = innerWidth, H = innerHeight;
  if (onScreen) return hud.marker((ndc.x * .5 + .5) * W, (-ndc.y * .5 + .5) * H - 70, 180, false, dist);
  let dx = ndc.x, dy = ndc.y; if (!front) { dx = -dx; dy = -dy; }
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const k = Math.min(.82 / Math.abs(dx || 1e-6), .72 / Math.abs(dy || 1e-6));
  hud.marker((dx * k * .5 + .5) * W, (-dy * k * .5 + .5) * H, Math.atan2(dx, dy) * 180 / Math.PI + 180, true, dist);
}

reset(); camera.position.copy(mission.start).add(new THREE.Vector3(20, 6, 20));
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;

  if (state === 'playing') {
    time += dt; prev.copy(glider.pos);
    glider.update(dt, input);
    const passed = course.update(dt, glider.pos, prev);
    const sweets = candies.update(dt, glider.pos);
    if (sweets) {
      glider.addEnergy(30 * sweets); earn(2 * sweets); audio.chime(0);
      trails.burst(glider.pos, '#ffd6e6', 14, 8);
      hud.say(`¡Dango! +${30 * sweets} de energía`, 1800);
    }
    if (passed >= 0) {
      trails.burst(course.rings[passed].c, '#ffd24a', 40, 18);
      trails.burst(course.rings[passed].c, '#ffb3cc', 30, 11);     // pétalos rosas
      audio.chime(passed);
      glider.addEnergy(25); addXp(10); earn(2); hud.rings(course.next, course.total); hud.flash('#fff3c4');
      const radio = STORY[mission.id]?.radio[passed];
      if (radio) hud.say(radio.text, 4800, radio.who); else if (mission.hints[passed]) hud.say(mission.hints[passed]);
      if (course.done) finish();
    }
    if (state === 'playing') {
      if (world.collide(glider.pos, 1.3)) crash();
      else if (glider.pos.y < 28 && !lowWarned && time > 5) { lowWarned = true; hud.say('¡Vas muy bajo! Mantén Espacio para Impulsar.', 4000); }
      if (glider.pos.y > 45) lowWarned = false;
      if (time > mission.limit && !timeWarned) { timeWarned = true; hud.say('Se acabó el tiempo… ¡pero sigue hasta el templo!', 3500); }
    }
    if (glider.boosting) for (const n of glider.nozzles) {
      n.getWorldPosition(tmp); trails.emit(tmp, glider.outfit.trail[Math.random() < .5 ? 0 : 1], .9, .6, fwd.copy(glider.forward(new THREE.Vector3())).multiplyScalar(-8));
    }
    followCamera(dt);
  } else if (state === 'menu' || state === 'story') {
    glider.idle(dt);
    const close = location.search.includes('closeup');
    if (close) glider.roll = Math.sin(t * 0.9) * 0.6; // demo: balanceo para revisar la animación
    const a = close ? Math.PI * 0.75 + Math.sin(t * .3) * .5 : t * 0.15, r = close ? 6 : 26;
    camera.position.set(glider.pos.x + Math.cos(a) * r, glider.pos.y + (close ? 2.5 : 6), glider.pos.z + Math.sin(a) * r);
    camera.lookAt(glider.pos.x, glider.pos.y + (close ? .5 : 0), glider.pos.z);
  } else if (state === 'done') {
    glider.idle(dt); followCamera(dt);
  }

  hud.time(time); hud.alt(glider.pos.y); hud.energy(glider.energy / 100, glider.boosting);
  trails.update(dt); petals.update(dt, glider.pos, t); world.update(dt, glider.pos, camera);
  if (state === 'playing') { wind.update(dt, camera, glider.speed); audio.setWind(glider.speed, glider.boosting); }
  else wind.update(dt, camera, 0);
  if (state !== 'paused') updateMarker();
  composer.render();
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// Banco de pruebas (solo con ?sim): window.__sim(id) simula una misión con piloto automático, sin dibujar.
if (location.search.includes('sim')) {
  (window as unknown as Record<string, unknown>).__finish = (id: string) => { selectMission(MISSIONS.find((x) => x.id === id)!); state = 'playing'; time = 20; course.next = course.total; finish(); };
  (window as unknown as Record<string, unknown>).__sim = (id: string) => {
    selectMission(MISSIONS.find((x) => x.id === id)!);
    const dt = 1 / 60, wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    let T = 0, crashes = 0, dulces = 0;
    const log: string[] = [];
    while (!course.done && T < 150) {
      const d = course.target.clone().sub(glider.pos), hd = Math.hypot(d.x, d.z);
      const x = Math.max(-1, Math.min(1, -wrap(Math.atan2(-d.x, -d.z) - glider.yaw) * 3));
      const boost = d.y + 0.17 * hd > 4, y = d.y < -0.35 * hd ? 0.6 : 0;
      prev.copy(glider.pos); glider.update(dt, { x, y, boost }); T += dt;
      const p = course.update(dt, glider.pos, prev);
      const sw = candies.update(dt, glider.pos);
      if (sw) { dulces += sw; glider.addEnergy(30 * sw); }
      if (p >= 0) { glider.addEnergy(25); log.push(`aro ${p + 1} a ${T.toFixed(1)}s, alt ${glider.pos.y.toFixed(0)}`); }
      if (world.collide(glider.pos, 1.3)) {
        crashes++; T += PENALTY; log.push(`CHOQUE en (${glider.pos.x.toFixed(0)},${glider.pos.y.toFixed(0)},${glider.pos.z.toFixed(0)}) rumbo a aro ${course.next + 1}`);
        const back = course.next > 0 ? course.rings[course.next - 1].c : mission.start;
        const c = back.clone(); c.y = Math.max(c.y, 75);
        const dd = course.target.clone().sub(c); glider.reset(c, Math.atan2(-dd.x, -dd.z)); prev.copy(c);
        if (crashes > 12) break;
      }
    }
    const res = { mision: id, completa: course.done, dulces, tiempo: +T.toFixed(1), limite: mission.limit, tresEstrellas: mission.threeStar, choques: crashes, log };
    reset();
    return res;
  };
}
