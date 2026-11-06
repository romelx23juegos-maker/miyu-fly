// Taller: trajes (cosméticos) y mejoras de vuelo, comprados con pétalos.
export interface Outfit {
  id: string; name: string; price: number;
  tint: string;                                   // tono del modelo de Miyu
  canopy: { base: string; band: string; band2: string; flower: string; line: string };
  trail: [string, string]; glow: string;          // estela y brillo del jetpack
}
export const OUTFITS: Outfit[] = [
  { id: 'clasico', name: 'Uniforme clásico', price: 0, tint: '#ffffff', glow: '#c58bff', trail: ['#c58bff', '#ff9fd0'],
    canopy: { base: '#fbe4d8', band: '#f26f93', band2: '#f7a3bb', flower: '#f48aa8', line: '#efc3b4' } },
  { id: 'sakura', name: 'Traje Sakura', price: 40, tint: '#ffcfe0', glow: '#ff8fb8', trail: ['#ff9fd0', '#ffd6e6'],
    canopy: { base: '#ffeaf1', band: '#d94a7a', band2: '#f59ab9', flower: '#ee6f9c', line: '#f4c2d2' } },
  { id: 'ola', name: 'Traje Ola', price: 70, tint: '#b9d6ff', glow: '#5fb8ff', trail: ['#6ec8ff', '#c2eaff'],
    canopy: { base: '#e6f3ff', band: '#2f7fd0', band2: '#7fb6ee', flower: '#4a9ae0', line: '#b8d6f2' } },
  { id: 'dorado', name: 'Traje Festival', price: 120, tint: '#ffe3a0', glow: '#ffc93a', trail: ['#ffd24a', '#fff0a8'],
    canopy: { base: '#fff4d2', band: '#d9971f', band2: '#f2c75a', flower: '#f2a31f', line: '#ecd59a' } },
];

export const UPGRADES = [
  { id: 'glide', name: 'Planeo', desc: 'Pierdes menos altura al planear.', costs: [30, 60, 100] },
  { id: 'boost', name: 'Impulso', desc: 'La energía del jetpack dura más y se recarga antes.', costs: [30, 60, 100] },
  { id: 'agil', name: 'Agilidad', desc: 'Giras más rápido para apuntar a los aros.', costs: [30, 60, 100] },
];

export interface ShopSave { petals: number; outfit: string; owned: string[]; up: Record<string, number> }
export const outfitOf = (id: string) => OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];

const $ = (id: string) => document.getElementById(id)!;

/** Dibuja el Taller; `onChange` se llama tras cada compra o cambio de traje. */
export function renderShop(save: ShopSave, onChange: () => void) {
  $('shopPetals').textContent = String(save.petals);
  const out = $('outfits'); out.innerHTML = '';
  for (const o of OUTFITS) {
    const owned = save.owned.includes(o.id), eq = save.outfit === o.id;
    const b = document.createElement('button');
    b.className = 'oc' + (eq ? ' eq' : '');
    b.innerHTML = `<span class="sw" style="background:linear-gradient(135deg,${o.canopy.base} 0 45%,${o.canopy.band} 45% 70%,${o.tint} 70%)"></span>` +
      `<span class="on">${o.name}</span><span class="ob">${eq ? 'Equipado' : owned ? 'Equipar' : `🌸 ${o.price}`}</span>`;
    if (!owned && save.petals < o.price) b.disabled = true;
    b.onclick = () => {
      if (!owned) { if (save.petals < o.price) return; save.petals -= o.price; save.owned.push(o.id); }
      save.outfit = o.id; onChange(); renderShop(save, onChange);
    };
    out.appendChild(b);
  }
  const up = $('upgrades'); up.innerHTML = '';
  for (const u of UPGRADES) {
    const lv = save.up[u.id] ?? 0, max = u.costs.length, cost = u.costs[lv];
    const row = document.createElement('div'); row.className = 'ur';
    row.innerHTML = `<div><b>${u.name}</b><small>${u.desc}</small></div><span class="pips">${u.costs.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>`;
    const b = document.createElement('button'); b.className = 'ub';
    b.textContent = lv >= max ? 'Máximo' : `Mejorar 🌸 ${cost}`;
    b.disabled = lv >= max || save.petals < cost;
    b.onclick = () => { if (lv >= max || save.petals < cost) return; save.petals -= cost; save.up[u.id] = lv + 1; onChange(); renderShop(save, onChange); };
    row.appendChild(b); up.appendChild(row);
  }
}
