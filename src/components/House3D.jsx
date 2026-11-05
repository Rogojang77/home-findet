import { useEffect, useRef } from 'react';
import { createHouse } from '../lib/house.js';

export function House3D({ db, hl }) {
  const canvasRef = useRef(null), house = useRef(null);
  useEffect(() => { house.current = createHouse(canvasRef.current); return () => house.current.dispose(); }, []);
  useEffect(() => { house.current.build(db, hl); }, [db, hl]);
  return (
    <section className="panel">
      <h2>Casa în 3D</h2>
      <div className="view">
        <canvas ref={canvasRef} />
        <span className="hint">Trage pentru a roti · scroll pentru zoom</span>
      </div>
    </section>
  );
}
