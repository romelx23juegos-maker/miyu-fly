import { CHARS } from './story';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let sayTimer = 0;

export const hud = {
  time(s: number) {
    const m = Math.floor(s / 60), r = s - m * 60;
    $('time').textContent = `${String(m).padStart(2, '0')}:${r.toFixed(1).padStart(4, '0')}`;
  },
  rings(n: number, total: number) { $('starTxt').textContent = `${n} / ${total}`; },
  alt(a: number, max = 130) {
    $('altTxt').textContent = `${Math.max(0, Math.round(a))} m`;
    $('altbar').querySelector('i')!.style.height = `${Math.max(2, Math.min(100, (a / max) * 100))}%`;
  },
  energy(f: number, on: boolean) { const b = $('boost'); b.style.setProperty('--e', String(Math.round(f * 100))); b.classList.toggle('on', on); },
  xp(level: number, frac: number) { $('lvl').textContent = `Nv. ${level}`; $('xp').querySelector('i')!.style.width = `${frac * 100}%`; },
  say(text: string, ms = 4800, who = 'miyu') {
    const c = CHARS[who] ?? CHARS.miyu;
    $('sayName').textContent = c.name; $('sayUse').setAttribute('href', `#${CHARS[who] ? who : 'miyu'}`);
    $('saytxt').textContent = text; $('say').classList.add('show');
    clearTimeout(sayTimer); sayTimer = window.setTimeout(() => $('say').classList.remove('show'), ms);
  },
  flash(color = '#fff') {
    const f = $('flash'); f.style.transition = 'none'; f.style.background = color; f.style.opacity = '.85';
    requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity .6s'; f.style.opacity = '0'; }));
  },
  screen(id: 'title' | 'pauseScr' | 'results' | 'missions' | 'shop' | null) {
    for (const s of ['title', 'pauseScr', 'results', 'missions', 'shop']) $(s).classList.toggle('show', s === id);
  },
  petals(n: number) { $('petalTxt').textContent = String(n); },
  mission(name: string, text: string) { $('missionName').textContent = `★ ${name}`; $('missionTxt').textContent = text; },
  missionList(items: { id: string; name: string; blurb: string; stars: number; limit: number; lock?: string }[], current: string, pick: (id: string) => void) {
    const list = $('mlist'); list.innerHTML = '';
    for (const m of items) {
      const b = document.createElement('button');
      b.className = 'mi' + (m.id === current ? ' cur' : '') + (m.lock ? ' lock' : '');
      b.innerHTML = m.lock
        ? `<span class="mn">🔒 ${m.name}</span><span class="mt">${m.lock}</span>`
        : `<span class="mn">${m.name}</span><span class="md">${m.blurb} · ${m.limit} s</span>` +
          `<span class="ms">${[0, 1, 2].map((i) => `<i class="${i < m.stars ? '' : 'off'}">★</i>`).join('')}</span>`;
      if (m.lock) b.disabled = true; else b.onclick = () => pick(m.id);
      list.appendChild(b);
    }
  },
  marker(x: number, y: number, angle: number, arrow: boolean, dist: number) {
    const m = $('marker');
    m.style.display = 'block'; m.style.left = `${x}px`; m.style.top = `${y}px`;
    $('arrow').parentElement!.style.transform = `rotate(${arrow ? angle : 180}deg)`;
    $('dist').textContent = `${Math.round(dist)} m`;
  },
  hideMarker() { $('marker').style.display = 'none'; },
  results(stars: number, time: number, rings: number, total: number, win: boolean, note?: string) {
    $('resTitle').textContent = win ? '¡Misión cumplida!' : 'Misión incompleta';
    $('resStars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? '' : 'off'}">★</span>`).join('');
    $('resTxt').textContent = `Aros: ${rings}/${total} · Tiempo: ${time.toFixed(1)} s` + (note ? ` · ${note}` : '');
    this.screen('results');
  },
};
export const el = $;
