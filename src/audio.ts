// Audio sintetizado con Web Audio (sin archivos): viento, campanita de aro y golpe.
let ctx: AudioContext | undefined;
let master: GainNode, wind: GainNode, windF: BiquadFilterNode;
let muted = false;
const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

function noise(c: AudioContext) {
  const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function tone(freq: number, delay: number, dur: number, vol: number, type: OscillatorType = 'sine') {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}

export const audio = {
  /** Debe llamarse tras un gesto del usuario (clic o tecla). */
  init() {
    if (ctx) { void ctx.resume(); return; }
    ctx = new AudioContext();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
    const src = ctx.createBufferSource(); src.buffer = noise(ctx); src.loop = true;
    windF = ctx.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 500; windF.Q.value = 0.6;
    wind = ctx.createGain(); wind.gain.value = 0;
    src.connect(windF).connect(wind).connect(master); src.start();
  },
  setWind(speed: number, boosting: boolean) {
    if (!ctx) return;
    const k = Math.min(1, Math.max(0, (speed - 8) / 36)), now = ctx.currentTime;
    wind.gain.setTargetAtTime(0.04 + 0.2 * k + (boosting ? 0.12 : 0), now, 0.15);
    windF.frequency.setTargetAtTime(350 + 900 * k + (boosting ? 500 : 0), now, 0.2);
  },
  hush() { if (ctx) wind.gain.setTargetAtTime(0, ctx.currentTime, 0.1); },
  chime(i: number) {
    const f = NOTES[Math.min(i, NOTES.length - 1)];
    tone(f, 0, 0.7, 0.22); tone(f * 1.5, 0.05, 0.6, 0.1); tone(f * 2, 0.1, 0.5, 0.07);
  },
  crash() {
    if (!ctx) return;
    const t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.4);
    g.gain.setValueAtTime(0.5, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    o.connect(g).connect(master); o.start(t0); o.stop(t0 + 0.5);
    const n = ctx.createBufferSource(), ng = ctx.createGain(); n.buffer = noise(ctx);
    ng.gain.setValueAtTime(0.25, t0); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
    n.connect(ng).connect(master); n.start(t0); n.stop(t0 + 0.3);
  },
  victory() { [0, 2, 4, 5].forEach((n, k) => tone(NOTES[n], k * 0.14, 0.8, 0.2)); },
  pause(on: boolean) { if (ctx) void (on ? ctx.suspend() : ctx.resume()); },
  toggleMute() { muted = !muted; if (ctx) master.gain.value = muted ? 0 : 0.5; return muted; },
};
