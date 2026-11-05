import { useEffect, useMemo, useState } from 'react';
import { House3D } from './components/House3D.jsx';
import { Inventory } from './components/Inventory.jsx';
import { Jarvis } from './components/Jarvis.jsx';
import { Results } from './components/Results.jsx';
import { ScanPanel } from './components/ScanPanel.jsx';
import { useJarvis } from './hooks/useJarvis.js';
import { addItem, addNode, byId, findTag, furnOf, load, move, path, save, seed, tagUsed } from './lib/inventory.js';
import { find, reply } from './lib/search.js';

export function App() {
  const [db, setDb] = useState(load);
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState(null);
  const [hl, setHl] = useState(null);
  const [msg, setMsg] = useState(null);
  const [newTag, setNewTag] = useState('');
  const jarvis = useJarvis();

  useEffect(() => save(db), [db]);
  const found = useMemo(() => find(db, q), [db, q]);

  // a new query highlights its first hit in 3D, unless an existing hit is already highlighted
  useEffect(() => {
    const { items, locs } = found;
    if (items.length) { if (!items.some(i => furnOf(db, i.loc) === hl)) setHl(furnOf(db, items[0].loc)); }
    else if (locs.length) setHl(furnOf(db, locs[0].id));
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = fn => setDb(d => { const draft = structuredClone(d); fn(draft); return draft; });
  const say = (text, err = false) => setMsg({ text, err });
  const where = l => path(db, l).join(' › ');
  const ask = text => jarvis.ask(() => reply(db, text));

  const scan = raw => {
    const tag = raw.trim().toUpperCase(); if (!tag) return;
    const { loc: place, item } = findTag(db, tag);
    setNewTag('');
    if (place) { setLoc(place.id); setHl(furnOf(db, place.id)); say(`Loc: ${where(place.id)}. Scanează un obiect ca să-l pui aici.`); }
    else if (item && loc && item.loc !== loc) { change(d => move(d, byId(d, 'items', item.id), loc)); setHl(furnOf(db, loc)); say(`${item.name} mutat în ${where(loc)}.`); }
    else if (item) { setQ(item.name); say(`${item.name} este în ${where(item.loc)}.`); }
    else if (loc) { setNewTag(tag); say(`Etichetă nouă ${tag}. Adaugă obiectul mai jos.`); }
    else say(`Etichetă necunoscută ${tag}. Scanează întâi un loc sau asociaz-o din Inventar.`, true);
  };

  const onAddItem = fields => {
    if (fields.tag && tagUsed(db, fields.tag)) { say(`Eticheta ${fields.tag} e deja folosită.`, true); return false; }
    change(d => addItem(d, { ...fields, loc }));
    setNewTag(''); say(`${fields.name} adăugat în ${where(loc)}.`);
    return true;
  };

  const onAddNode = (type, parent, name, tag) => {
    if (!name) { say('Scrie un nume.', true); return false; }
    if (type !== 'room' && !parent) { say('Adaugă întâi nivelul de deasupra (cameră, mobilă sau compartiment).', true); return false; }
    if (tag && tagUsed(db, tag)) { say(`Eticheta ${tag} e deja folosită.`, true); return false; }
    change(d => addNode(d, type, parent, name, tag));
    say(`Adăugat: ${name}.`);
    return true;
  };

  const onMove = (id, to) => {
    const item = byId(db, 'items', id);
    change(d => move(d, byId(d, 'items', id), to));
    setHl(furnOf(db, to)); say(`${item.name} mutat în ${where(to)}.`);
  };

  const onDelete = id => { change(d => { d.items = d.items.filter(i => i.id !== id); }); say('Obiect șters.'); };
  const pickLoc = id => { setLoc(id); setHl(furnOf(db, id)); setMsg(null); };
  const reset = () => { setDb(seed()); setQ(''); setLoc(null); setHl(null); setMsg(null); setNewTag(''); };

  return (
    <div className="wrap">
      <header><h1>Home Finder</h1><small>Faza 1 · MVP: inventar, etichete, căutare, 3D simplu</small></header>

      <form className="search" onSubmit={e => { e.preventDefault(); ask(q); }}>
        <input type="search" autoComplete="off" placeholder="Unde e bormașina?" aria-label="Întreabă-l pe Jarvis"
          value={q} onChange={e => setQ(e.target.value)} />
        <button className="primary">Întreabă</button>
      </form>

      <div className="grid">
        <div className="col">
          <Jarvis jarvis={jarvis} />
          <Results db={db} found={found} hl={hl} onHl={setHl} onExample={e => { setQ(e); ask(e); }}
            onMove={onMove} onDelete={onDelete} onPickLoc={pickLoc} />
          <House3D db={db} hl={hl} />
        </div>
        <div className="col">
          <ScanPanel db={db} loc={loc} msg={msg} newTag={newTag} onScan={scan} onAddItem={onAddItem}
            onLeave={() => { setLoc(null); setNewTag(''); setMsg(null); }} />
          <Inventory db={db} loc={loc} onPickLoc={pickLoc} onAdd={onAddNode} onReset={reset} />
        </div>
      </div>
    </div>
  );
}
