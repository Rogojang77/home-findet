import { DAY, allLocs, contentsOf, path } from './inventory.js';

// diacritics-insensitive, stop words dropped, one typo tolerated per word
export const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const STOP = new Set('unde e este sunt am mi ai pus pe gasesc gasi imi meu mea cu de la in din ce un o al a si'.split(' '));
export const toks = s => norm(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w));

export const lev = (a, b) => {
  if (Math.abs(a.length - b.length) > 1) return 9;
  const m = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    let p = m[0]; m[0] = i;
    for (let j = 1; j <= b.length; j++) { const t = m[j]; m[j] = Math.min(m[j] + 1, m[j - 1] + 1, p + (a[i - 1] !== b[j - 1])); p = t; }
  }
  return m[b.length];
};

export const matches = (qt, hay) => {
  const words = toks(hay);
  return qt.every(t => words.some(w => w.startsWith(t) || (t.length >= 4 && lev(t, w) <= 1)));
};

export const find = (db, q) => {
  const qt = toks(q);
  if (!qt.length) return { items:[], locs:[], empty:true };
  return {
    items: db.items.filter(i => matches(qt, [i.name, i.syn, i.cat].join(' '))),
    locs: allLocs(db).filter(l => matches(qt, l.label)),
    empty: false
  };
};

const rtf = new Intl.RelativeTimeFormat('ro', { numeric:'auto' });
export const ago = (t, now = Date.now()) => {
  const d = (t - now) / 1000;
  for (const [u, s] of [['year', 31536e3], ['month', 2592e3], ['day', 864e2], ['hour', 3600], ['minute', 60]]) if (Math.abs(d) >= s) return rtf.format(Math.round(d / s), u);
  return 'chiar acum';
};

// Jarvis' spoken answer
export const reply = (db, q) => {
  const { items, locs, empty } = find(db, q);
  if (empty) return 'Spune-mi ce cauți, de exemplu: unde e bormașina?';
  if (items.length) {
    const i = items[0];
    let s = `${i.name} e în ${path(db, i.loc).join(', ')}. Ultima actualizare: ${ago(i.at)}.`;
    if (Date.now() - i.at > 30 * DAY) s += ' Informația e mai veche de o lună, verifică dacă e tot acolo.';
    if (items.length > 1) s += ` Am mai găsit: ${items.slice(1, 4).map(o => o.name).join(', ')}.`;
    return s;
  }
  if (locs.length) {
    const l = locs[0], inside = contentsOf(db, l.id), where = path(db, l.id).join(', ');
    return inside.length ? `În ${where} ai: ${inside.map(o => o.name).join(', ')}.` : `${where} e gol.`;
  }
  return `Nu găsesc „${q.trim()}” în inventar. Încearcă un sinonim sau adaugă obiectul.`;
};
