import { useState } from 'react';
import { allLocs, contentsOf, furnOf, itemsAt, path } from '../lib/inventory.js';
import { ago } from '../lib/search.js';
import { Crumb } from './Crumb.jsx';

const EXAMPLES = ['Unde e bormașina?', 'încărcător laptop', 'Ce am în cutia de sub pat?', 'maișina de găurit'];

function ItemHit({ db, item, hl, onHl, onMove, onDelete }) {
  const [armed, setArmed] = useState(false);
  const furn = furnOf(db, item.loc);
  const near = itemsAt(db, item.loc).filter(o => o.id !== item.id).map(o => o.name);
  return (
    <article className={`hit${furn === hl ? ' on' : ''}`} onClick={e => !e.target.closest('select,button') && onHl(furn)}>
      <div className="hit-top">
        <h3>{item.name}</h3>
        <span className="chip">{item.cat || 'Fără categorie'}</span>
        {item.tag && <span className="chip">{item.tag}</span>}
      </div>
      <Crumb db={db} loc={item.loc} />
      <p className="meta">Actualizat {ago(item.at)}{near.length ? ` · lângă: ${near.join(', ')}` : ''}</p>
      <div className="row">
        <select value={item.loc} onChange={e => onMove(item.id, e.target.value)} aria-label={`Mută ${item.name}`}>
          {allLocs(db).map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <button className="ghost danger" onClick={() => (armed ? onDelete(item.id) : setArmed(true))}>
          {armed ? 'Sigur? Apasă din nou' : 'Șterge'}
        </button>
      </div>
    </article>
  );
}

export function Results({ db, found, hl, onHl, onExample, onMove, onDelete, onPickLoc }) {
  if (found.empty) return (
    <section className="panel">
      <h2>Întreabă</h2>
      <p className="empty">Caută după nume, sinonim sau loc. Merge și cu greșeli de tastare.</p>
      <div className="chips">{EXAMPLES.map(e => <button key={e} className="ghost" onClick={() => onExample(e)}>{e}</button>)}</div>
      <h2>Ultimele mutări</h2>
      {db.moves.length
        ? <ul className="list">{db.moves.slice(0, 6).map((m, i) =>
            <li key={i}><b>{m.name}</b> → {path(db, m.to).join(' › ')} <span className="meta">{ago(m.at)}</span></li>)}</ul>
        : <p className="empty">Nicio mutare încă.</p>}
    </section>
  );

  const { items, locs } = found;
  return (
    <section className="panel">
      <h2>{items.length} {items.length === 1 ? 'obiect găsit' : 'obiecte găsite'}</h2>
      <div className="hits">
        {items.length
          ? items.map(i => <ItemHit key={i.id} db={db} item={i} hl={hl} onHl={onHl} onMove={onMove} onDelete={onDelete} />)
          : <p className="empty">Niciun obiect cu numele ăsta. Încearcă un sinonim.</p>}
      </div>
      {locs.length > 0 && <>
        <h2>Locuri</h2>
        <div className="hits">{locs.map(l => {
          const inside = contentsOf(db, l.id);
          return (
            <article key={l.id} className="hit" onClick={() => onPickLoc(l.id)}>
              <Crumb db={db} loc={l.id} />
              <p className="meta">{inside.length ? inside.map(o => o.name).join(', ') : 'Gol'}</p>
            </article>
          );
        })}</div>
      </>}
    </section>
  );
}
