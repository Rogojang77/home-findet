import { containersIn, itemsAt } from '../lib/inventory.js';
import { Crumb } from './Crumb.jsx';

// NFC is simulated by typing or tapping a tag ID; real NFC comes with react-native-nfc-manager in the Expo app
export function ScanPanel({ db, loc, msg, newTag, onScan, onAddItem, onLeave }) {
  const sims = [...db.spots, ...db.containers, ...db.items].filter(o => o.tag).slice(0, 8);
  const inside = loc ? itemsAt(db, loc) : [], boxes = loc ? containersIn(db, loc) : [];

  const submitScan = e => { e.preventDefault(); onScan(e.target.tag.value); e.target.reset(); };
  const submitItem = e => {
    e.preventDefault();
    const f = new FormData(e.target), name = f.get('name').trim();
    if (name && onAddItem({ name, syn:f.get('syn').trim(), cat:f.get('cat').trim(), tag:f.get('tag').trim().toUpperCase() })) {
      e.target.reset(); e.target.name.focus();
    }
  };

  return (
    <section className="panel">
      <h2>Scanare etichetă</h2>
      <form onSubmit={submitScan}>
        <input name="tag" id="tag" placeholder="ID etichetă, ex. NFC-0001" autoComplete="off" />
        <button className="primary">Scanează</button>
      </form>
      <div className="chips">
        <span className="meta">Simulare:</span>
        {sims.map(o => <button key={o.tag} className="ghost chip" onClick={() => onScan(o.tag)}>{o.tag}</button>)}
      </div>
      {msg && <p className={`msg${msg.err ? ' err' : ''}`}>{msg.text}</p>}
      {loc && (
        <div className="here">
          <h2>Locul curent</h2>
          <Crumb db={db} loc={loc} />
          {inside.length || boxes.length
            ? <ul className="list">
                {inside.map(i => <li key={i.id}>{i.name}</li>)}
                {boxes.map(c => <li key={c.id}><b>{c.name}</b>: {itemsAt(db, c.id).map(i => i.name).join(', ') || 'goală'}</li>)}
              </ul>
            : <p className="empty">Nimic aici încă.</p>}
          <form key={loc + newTag} onSubmit={submitItem}>
            <input name="name" placeholder="Obiect nou, ex. Șurubelnițe" required />
            <input name="syn" placeholder="Sinonime, separate prin virgulă" />
            <input name="cat" placeholder="Categorie" />
            <input name="tag" placeholder="Etichetă (opțional)" defaultValue={newTag} />
            <button className="primary">Adaugă aici</button>
            <button type="button" className="ghost" onClick={onLeave}>Închide</button>
          </form>
        </div>
      )}
    </section>
  );
}
