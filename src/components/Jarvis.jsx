import { useEffect, useRef, useState } from 'react';
import { createAvatar } from '../lib/avatar.js';
import { startTracking } from '../lib/tracking.js';

export function Jarvis({ jarvis }) {
  const { line, mode, voiceOn, toggleVoice, speak, setLine } = jarvis;
  const canvasRef = useRef(null);
  const live = useRef({ mode, look:{ x:0, y:0, active:false, src:'' } });
  live.current.mode = mode;
  const [stopCam, setStopCam] = useState(null);

  useEffect(() => createAvatar(canvasRef.current, () => live.current), []);
  useEffect(() => () => stopCam?.(), [stopCam]);

  const onPointerMove = e => {
    const look = live.current.look;
    if (look.src === 'cam' && stopCam) return;
    const b = e.currentTarget.getBoundingClientRect();
    Object.assign(look, { x:((e.clientX - b.left) / b.width) * 2 - 1, y:((e.clientY - b.top) / b.height) * 2 - 1, active:true, src:'pointer' });
  };
  const onPointerLeave = () => { const look = live.current.look; if (look.src === 'pointer') look.active = false; };

  const toggleCam = async () => {
    if (stopCam) { setStopCam(null); live.current.look.active = false; return; }
    try {
      const stop = await startTracking(p => Object.assign(live.current.look, p, { active:true, src:'cam' }));
      setStopCam(() => stop);
      speak('Te văd. De acum te urmăresc.');
    } catch {
      setLine('Nu am acces la cameră. Permite camera în browser (merge pe localhost sau HTTPS). Până atunci te urmăresc după mouse.');
    }
  };

  return (
    <section className={`panel jarvis ${mode}`} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="bubble">
        <h2>Jarvis</h2>
        <p aria-live="polite">{line}</p>
        <div className="row">
          <button className="ghost" onClick={toggleVoice}>{voiceOn ? 'Voce: pornită' : 'Voce: oprită'}</button>
          <button className="ghost" onClick={toggleCam}>{stopCam ? 'Oprește camera' : 'Urmărește-mă cu camera'}</button>
        </div>
      </div>
    </section>
  );
}
