// Historia: personajes, diálogos por misión y motor de diálogos tipo novela visual.
export interface Line { who: string; text: string }
interface Char { id: string; name: string; role: string; bg: string; skin: string; hair: string; accent: string; style: 'bun' | 'spiky' | 'long' | 'topknot'; eyes?: 'closed'; extra?: 'glasses' | 'band' | 'mustache' }

export const CHARS: Record<string, { name: string; role: string }> = {
  miyu: { name: 'Miyu', role: 'Cadete del Correo del Cielo' },
  hana: { name: 'Abuela Hana', role: 'Guardiana del templo' },
  kenji: { name: 'Kenji', role: 'Barquero del río' },
  tadashi: { name: 'Señor Tadashi', role: 'Señor del castillo' },
  aoi: { name: 'Sensei Aoi', role: 'Instructora de vuelo' },
};

const DESIGNS: Char[] = [
  { id: 'hana', ...CHARS.hana, bg: '#f3dcec', skin: '#ffe0cc', hair: '#c9c9d6', accent: '#b57edc', style: 'bun', eyes: 'closed' },
  { id: 'kenji', ...CHARS.kenji, bg: '#cfeaf2', skin: '#f2c9a5', hair: '#2b2b3a', accent: '#2f9aa8', style: 'spiky', extra: 'band' },
  { id: 'tadashi', ...CHARS.tadashi, bg: '#e6dcc8', skin: '#f0d0b0', hair: '#26222c', accent: '#4a3b78', style: 'topknot', extra: 'mustache' },
  { id: 'aoi', ...CHARS.aoi, bg: '#d6e4f5', skin: '#ffe3d0', hair: '#1f2a4a', accent: '#3d5a9a', style: 'long', extra: 'glasses' },
];

function avatar(c: Char): string {
  const back = {
    bun: `<ellipse cx="50" cy="52" rx="30" ry="32" fill="${c.hair}"/><circle cx="50" cy="17" r="11" fill="${c.hair}"/>`,
    spiky: `<path d="M18 54 L20 24 L35 36 L42 12 L54 32 L67 14 L72 34 L86 24 L82 54Z" fill="${c.hair}"/>`,
    long: `<ellipse cx="50" cy="58" rx="35" ry="43" fill="${c.hair}"/>`,
    topknot: `<ellipse cx="50" cy="50" rx="28" ry="30" fill="${c.hair}"/><rect x="43" y="6" width="14" height="18" rx="6" fill="${c.hair}"/>`,
  }[c.style];
  const eyes = c.eyes === 'closed'
    ? `<path d="M34 60 Q40 55 46 60M54 60 Q60 55 66 60" stroke="#4a2a1e" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="40" cy="60" rx="4.2" ry="5.6" fill="#2a1a1a"/><ellipse cx="60" cy="60" rx="4.2" ry="5.6" fill="#2a1a1a"/><circle cx="41.5" cy="58" r="1.6" fill="#fff"/><circle cx="61.5" cy="58" r="1.6" fill="#fff"/>`;
  const extra = c.extra === 'glasses'
    ? `<circle cx="40" cy="60" r="8" fill="none" stroke="#6a6a7a" stroke-width="2"/><circle cx="60" cy="60" r="8" fill="none" stroke="#6a6a7a" stroke-width="2"/><path d="M48 60 H52" stroke="#6a6a7a" stroke-width="2"/>`
    : c.extra === 'band' ? `<rect x="24" y="38" width="52" height="7" rx="3" fill="#d9442f"/><path d="M74 41 L88 36 M74 43 L90 46" stroke="#d9442f" stroke-width="4" stroke-linecap="round"/>`
    : c.extra === 'mustache' ? `<path d="M38 71 Q44 67 50 71 Q56 67 62 71 Q56 74 50 72 Q44 74 38 71Z" fill="${c.hair}"/>` : '';
  const mouth = c.extra === 'mustache' ? '' : `<path d="M44 71 Q50 77 56 71" stroke="#c0555a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  return `<symbol id="${c.id}" viewBox="0 0 100 100"><rect width="100" height="100" fill="${c.bg}"/>${back}` +
    `<path d="M12 100 Q50 72 88 100Z" fill="${c.accent}"/><ellipse cx="50" cy="58" rx="25" ry="27" fill="${c.skin}"/>` +
    `<path d="M24 52 Q30 28 50 28 Q71 28 77 52 Q62 40 50 44 Q38 40 24 52Z" fill="${c.hair}"/>` +
    `${eyes}<ellipse cx="33" cy="69" rx="5" ry="3" fill="#ffb3b3" opacity=".6"/><ellipse cx="67" cy="69" rx="5" ry="3" fill="#ffb3b3" opacity=".6"/>${mouth}${extra}</symbol>`;
}
document.querySelector('svg defs')?.insertAdjacentHTML('beforeend', DESIGNS.map(avatar).join(''));

export interface Chapter { intro: Line[]; outro: Line[]; stamp: string; radio: Record<number, Line> }
export const STORY: Record<string, Chapter> = {
  templo: {
    intro: [
      { who: 'miyu', text: '¡Mi primer día como cadete del Correo del Cielo! Con mi parapente de alas de sakura, nada me detiene.' },
      { who: 'hana', text: 'Miyu, querida. Soy Hana, guardiana del templo de la pagoda roja. Dentro de cuatro días es el Festival de las Luces del Cielo.' },
      { who: 'hana', text: 'Los seis aros dorados guían a los pilotos hasta el templo. Si llegas a tiempo, toda la ciudad sabrá que tiene una nueva piloto.' },
      { who: 'miyu', text: '¡Cuenta conmigo, abuela Hana! Sigo los aros y llego volando.' },
    ],
    outro: [
      { who: 'hana', text: '¡Lo lograste! Esta flor de sakura del templo será tu primer sello.' },
      { who: 'miyu', text: '¡Gracias! Por cierto… dicen que un barquero presume de ser el más rápido del río.' },
    ],
    stamp: 'Sello del Templo 🌸',
    radio: { 4: { who: 'hana', text: '¡Ya te veo, querida! Cuidado con la pagoda.' } },
  },
  rio: {
    intro: [
      { who: 'kenji', text: '¡Eh, cadete! Soy Kenji, el barquero más rápido del río Sakura. Dicen que vuelas… ¿pero más rápido que mi barca?' },
      { who: 'miyu', text: 'Yo no digo que sí… ¡digo que lo vamos a comprobar!' },
      { who: 'kenji', text: 'Sigue el cauce, pasa bajo los puentes y sin tocar nada. ¡Treinta y cinco segundos o pagas los dulces!' },
    ],
    outro: [
      { who: 'kenji', text: '¡Increíble! Nadie había pasado tan rápido bajo el puente rojo. Tienes mi respeto, piloto.' },
      { who: 'kenji', text: 'El señor del castillo busca a alguien de confianza para una entrega muy especial. Ve a verlo.' },
    ],
    stamp: 'Sello del Río 🌊',
    radio: {
      0: { who: 'kenji', text: '¡Vaya, no está mal! Pero mi barca aún no se rinde.' },
      3: { who: 'kenji', text: '¡Último tramo! ¡No frenes ahora!' },
    },
  },
  castillo: {
    intro: [
      { who: 'tadashi', text: 'Soy Tadashi, señor del castillo de la colina. Tengo un paquete urgente: el farol principal del Festival de las Luces.' },
      { who: 'tadashi', text: 'Los caminos están cerrados por los preparativos. Solo se puede llegar por el aire.' },
      { who: 'miyu', text: '¡Entrega aérea! Lo llevaré con mucho cuidado, rodeando la torre.' },
      { who: 'tadashi', text: 'Ojo con el viento de la colina. Cuarenta y cinco segundos, joven piloto.' },
    ],
    outro: [
      { who: 'tadashi', text: 'El farol llegó sin un rasguño. El castillo te debe un favor.' },
      { who: 'tadashi', text: 'Mi instructora de vuelo, Aoi, quiere ponerte a prueba antes del festival.' },
    ],
    stamp: 'Sello del Castillo 🏯',
    radio: { 0: { who: 'tadashi', text: 'Veo tu parapente desde la torre. ¡Adelante!' } },
  },
  precision: {
    intro: [
      { who: 'aoi', text: 'Soy la Sensei Aoi. Para pilotar en el festival necesitas puntería: los aros de las luces son diminutos.' },
      { who: 'aoi', text: 'Cruza los ocho aros sobre los tejados. Frena con ↓ para apuntar, y no tengas prisa… pero tampoco demasiada.' },
      { who: 'miyu', text: '¡Concentración total!' },
    ],
    outro: [
      { who: 'aoi', text: 'Pulso firme y buen ojo. Oficialmente eres piloto del Correo del Cielo.' },
      { who: 'miyu', text: '¡Lo logré! ¡Ahora, al Festival de las Luces!' },
      { who: 'hana', text: 'Todos te esperamos con las linternas encendidas, querida.' },
    ],
    stamp: 'Sello de Plata del Cielo ✨',
    radio: {
      2: { who: 'aoi', text: 'Respira. Apunta. Cruza.' },
      5: { who: 'aoi', text: 'Muy bien. Ya casi.' },
    },
  },
};

// ---- motor de diálogos
const $ = (id: string) => document.getElementById(id)!;
let queue: Line[] = [], idx = 0, full = '', shown = 0, timer = 0, active = false, done: (() => void) | null = null;

function render() { $('vnText').textContent = full.slice(0, shown); }
function show() {
  const l = queue[idx], c = CHARS[l.who] ?? CHARS.miyu;
  $('vnName').textContent = c.name; $('vnRole').textContent = c.role;
  $('vnUse').setAttribute('href', `#${CHARS[l.who] ? l.who : 'miyu'}`);
  full = l.text; shown = 0; render(); clearInterval(timer);
  timer = window.setInterval(() => { shown++; render(); if (shown >= full.length) clearInterval(timer); }, 22);
}
function end() {
  active = false; clearInterval(timer); $('vn').classList.remove('show'); document.body.classList.remove('vn');
  const cb = done; done = null; cb?.();
}

export const story = {
  get active() { return active; },
  play(lines: Line[], onDone: () => void) {
    if (!lines.length) return onDone();
    queue = lines; idx = 0; done = onDone; active = true; $('vn').classList.add('show'); document.body.classList.add('vn'); show();
  },
  advance() {
    if (!active) return;
    if (shown < full.length) { shown = full.length; clearInterval(timer); render(); return; }
    if (++idx >= queue.length) end(); else show();
  },
  skip() { if (active) end(); },
};
$('vn').addEventListener('click', () => story.advance());
