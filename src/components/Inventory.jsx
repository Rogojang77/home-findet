import { useState } from 'react';
import { byId, containersIn, itemsAt, path } from '../lib/inventory.js';

const PARENTS = {
  room: () => [],
  furniture: db => db.rooms.map(r => [r.id, r.name]),
  spot: db => db.furniture.map(f => [f.id, `${byId(db, 'rooms', f.roomId).name} › ${f.name}`]),
  container: db => db.spots.map(s => [s.id, path(db, s.id).join(' › ')])
};

function LocButton({ db, node, loc, sub, onPick }) {
  return (
    <button className={`loc${sub ? ' sub' : ''}${node.id === loc ? ' on' : ''}`} onClick={() => onPick(node.id)}>
      <span>{node.name}</span><span className="count">{node.tag || ''} · {itemsAt(db, node.id).length}</span>
    </button>
  );
}

export function Inventory({ db, loc, onPickLoc, onAdd, onReset }) {
  const [type, setType] = useState('spot');
  const [parent, setParent] = useState('');
  const [armed, setArmed] = useState(false);
  const parents = PARENTS[type](db);
  const parentId = parents.some(([id]) => id === parent) ? parent : parents[0]?.[0] ?? '';

  const submit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (onAdd(type, parentId, f.get('name').trim(), (f.get('tag') ?? '').trim().toUpperCase())) e.target.reset();
  };

  return (
    <section className="panel">
      <h2>Inventar</h2>
      <div>{db.rooms.map(r => {
        const furn = db.furniture.filter(f => f.roomId === r.id);
        return (
          <details key={r.id} open>
            <summary>{r.name}</summary>
            <div className="tree">
              {furn.length ? furn.map(f => (
                <div key={f.id}>
                  <div className="furn">{f.name}</div>
                  {db.spots.filter(s => s.furnitureId === f.id).map(s => (
                    <div key={s.id}>
                      <LocButton db={db} node={s} loc={loc} onPick={onPickLoc} />
                      {containersIn(db, s.id).map(c => <LocButton key={c.id} db={db} node={c} loc={loc} sub onPick={onPickLoc} />)}
                    </div>
                  ))}
                </div>
              )) : <p className="empty">Nicio mobilă.</p>}
            </div>
          </details>
        );
      })}</div>
      <form onSubmit={submit}>
        <select value={type} onChange={e => setType(e.target.value)} aria-label="Tip">
          <option value="room">Cameră</option>
          <option value="furniture">Mobilă</option>
          <option value="spot">Compartiment</option>
          <option value="container">Cutie</option>
        </select>
        {type !== 'room' && (
          <select value={parentId} onChange={e => setParent(e.target.value)} aria-label="În">
            {parents.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
          </select>
        )}
        <input name="name" placeholder="Nume, ex. Sertarul 3" />
        {(type === 'spot' || type === 'container') && <input name="tag" placeholder="Etichetă (opțional)" />}
        <button>Adaugă</button>
      </form>
      <div className="row">
        <button className="ghost danger" onClick={() => (armed ? (onReset(), setArmed(false)) : setArmed(true))}>
          {armed ? 'Sigur? Se pierd datele tale. Apasă din nou' : 'Resetează la datele de exemplu'}
        </button>
      </div>
    </section>
  );
}
