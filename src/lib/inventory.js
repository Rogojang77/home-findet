// Inventory model from the concept doc: room → furniture → storage spot → (container) → item, plus a move log.
export const KEY = 'homefinder-v1';
export const DAY = 864e5;
export const uid = () => Math.random().toString(36).slice(2, 9);

export const seed = (now = Date.now()) => ({
  rooms: [{ id:'r1', name:'Debara' }, { id:'r2', name:'Sufragerie' }, { id:'r3', name:'Dormitor' }],
  furniture: [
    { id:'f1', roomId:'r1', name:'Raft metalic', x:.2, z:.2, w:1.6, d:.5, h:1.9 },
    { id:'f2', roomId:'r1', name:'Dulap debara', x:2.4, z:.2, w:1.3, d:.6, h:2 },
    { id:'f3', roomId:'r2', name:'Comodă TV', x:.8, z:2.6, w:2.2, d:.5, h:.6 },
    { id:'f6', roomId:'r2', name:'Canapea', x:.6, z:.3, w:2.6, d:.9, h:.8 },
    { id:'f4', roomId:'r3', name:'Pat', x:.7, z:.9, w:1.6, d:2.1, h:.5 },
    { id:'f5', roomId:'r3', name:'Șifonier', x:2.7, z:.2, w:1.1, d:.6, h:2.1 }],
  spots: [
    { id:'s1', furnitureId:'f1', name:'Raftul de sus', tag:'NFC-0001' },
    { id:'s2', furnitureId:'f1', name:'Raftul de jos', tag:'NFC-0002' },
    { id:'s3', furnitureId:'f2', name:'Raftul din mijloc', tag:'NFC-0003' },
    { id:'s4', furnitureId:'f3', name:'Sertarul 1', tag:'NFC-0004' },
    { id:'s5', furnitureId:'f3', name:'Sertarul 2', tag:'NFC-0005' },
    { id:'s6', furnitureId:'f4', name:'Sub pat', tag:'NFC-0006' },
    { id:'s7', furnitureId:'f5', name:'Raftul de sus', tag:'NFC-0007' }],
  containers: [
    { id:'c1', spotId:'s1', name:'Cutia albastră', tag:'NFC-0101' },
    { id:'c2', spotId:'s6', name:'Cutia de sub pat', tag:'NFC-0102' }],
  items: [
    { id:'i1', name:'Bormașină', syn:'mașina de găurit, drill, autofiletantă', cat:'Scule', loc:'c1', tag:'NFC-1001', at:now - 40 * DAY },
    { id:'i2', name:'Set burghie', syn:'burghiu, burghie beton', cat:'Scule', loc:'c1', tag:'', at:now - 40 * DAY },
    { id:'i3', name:'Încărcător laptop', syn:'alimentator, cablu laptop, charger', cat:'Electronice', loc:'s4', tag:'NFC-1002', at:now - 2 * DAY },
    { id:'i4', name:'Cablu HDMI 2m', syn:'hdmi, cablu tv', cat:'Electronice', loc:'s4', tag:'', at:now - 15 * DAY },
    { id:'i5', name:'Acte mașină', syn:'talon, asigurare RCA, carte identitate auto', cat:'Documente', loc:'s5', tag:'NFC-1003', at:now - 90 * DAY },
    { id:'i6', name:'Decorațiuni Crăciun', syn:'globuri, beteală, instalație brad', cat:'Decorațiuni', loc:'c2', tag:'', at:now - 300 * DAY },
    { id:'i7', name:'Pături de iarnă', syn:'pătură, plapumă', cat:'Textile', loc:'c2', tag:'', at:now - 200 * DAY },
    { id:'i8', name:'Trusă prim ajutor', syn:'pansamente, bandaje, medicamente', cat:'Sănătate', loc:'s3', tag:'', at:now - 60 * DAY },
    { id:'i9', name:'Ruletă 5m', syn:'metru, ruleta', cat:'Scule', loc:'s2', tag:'', at:now - 10 * DAY }],
  moves: [{ item:'i3', name:'Încărcător laptop', from:'s5', to:'s4', at:now - 2 * DAY }]
});

// shortcut: localStorage keeps data in this browser only; move to Supabase (per the doc) for multi-device sync
export const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) return d; } catch { /* corrupt or blocked */ } return seed(); };
export const save = db => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ } };

export const byId = (db, coll, id) => db[coll].find(o => o.id === id);
export const spotOf = (db, loc) => { const c = byId(db, 'containers', loc); return c ? byId(db, 'spots', c.spotId) : byId(db, 'spots', loc); };
export const furnOf = (db, loc) => spotOf(db, loc)?.furnitureId ?? null;
export const path = (db, loc) => {
  const c = byId(db, 'containers', loc), s = spotOf(db, loc);
  if (!s) return ['(loc șters)'];
  const f = byId(db, 'furniture', s.furnitureId), r = byId(db, 'rooms', f.roomId);
  return [r.name, f.name, s.name, c?.name].filter(Boolean);
};
export const allLocs = db => [...db.spots, ...db.containers].map(o => ({ id:o.id, tag:o.tag, label:path(db, o.id).join(' › ') }));
export const itemsAt = (db, loc) => db.items.filter(i => i.loc === loc);
export const containersIn = (db, spotId) => db.containers.filter(c => c.spotId === spotId);
export const contentsOf = (db, loc) => [...itemsAt(db, loc), ...containersIn(db, loc).flatMap(c => itemsAt(db, c.id))];
export const tagUsed = (db, tag) => [...db.spots, ...db.containers, ...db.items].some(o => o.tag && o.tag === tag);
export const findTag = (db, tag) => ({
  loc: [...db.spots, ...db.containers].find(o => o.tag === tag),
  item: db.items.find(i => i.tag === tag)
});

// mutators: call on a draft copy (see App's `change`)
export const move = (db, item, to) => {
  if (item.loc === to) return;
  db.moves.unshift({ item:item.id, name:item.name, from:item.loc, to, at:Date.now() });
  db.moves.length = Math.min(db.moves.length, 200);
  item.loc = to; item.at = Date.now();
};
export const addItem = (db, fields) => {
  const it = { id:uid(), at:Date.now(), ...fields };
  db.items.push(it);
  db.moves.unshift({ item:it.id, name:it.name, from:null, to:it.loc, at:it.at });
  return it;
};
export const addNode = (db, type, parent, name, tag) => {
  const id = uid();
  if (type === 'room') db.rooms.push({ id, name });
  if (type === 'furniture') {
    const n = db.furniture.filter(f => f.roomId === parent).length;
    db.furniture.push({ id, roomId:parent, name, x:.2 + (n % 3) * 1.25, z:.2 + Math.floor(n / 3) * 1.1, w:1, d:.6, h:1 });
  }
  if (type === 'spot') db.spots.push({ id, furnitureId:parent, name, tag });
  if (type === 'container') db.containers.push({ id, spotId:parent, name, tag });
};
