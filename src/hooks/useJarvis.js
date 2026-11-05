import { useCallback, useEffect, useRef, useState } from 'react';
import { KEY } from '../lib/inventory.js';

const VOICE_KEY = KEY + '-voice';

// Jarvis' line, mood ('idle' | 'thinking' | 'speaking') and Romanian text-to-speech
export function useJarvis() {
  const [line, setLine] = useState('Salut! Sunt Jarvis. Întreabă-mă unde e un obiect sau ce ai într-o cutie.');
  const [mode, setMode] = useState('idle');
  const [voiceOn, setVoiceOn] = useState(() => { try { return localStorage.getItem(VOICE_KEY) !== 'off'; } catch { return true; } });
  const seq = useRef(0), timers = useRef([]);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => () => { timers.current.forEach(clearTimeout); try { speechSynthesis.cancel(); } catch { /* no speech api */ } }, []);

  const speak = useCallback(text => {
    const id = ++seq.current;
    const done = () => { if (seq.current === id) setMode('idle'); }; // ignore stale utterances cancelled by a newer one
    setLine(text); setMode('speaking');
    const syn = window.speechSynthesis;
    if (!voiceOn || !syn) return later(done, Math.min(4000, 45 * text.length));
    try {
      syn.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'ro-RO';
      const v = syn.getVoices().find(v => v.lang.toLowerCase().startsWith('ro')); if (v) u.voice = v;
      u.onend = u.onerror = done; syn.speak(u);
      later(done, 20000); // some browsers never fire onend
    } catch { later(done, 1500); }
  }, [voiceOn]);

  const ask = useCallback(answer => {
    const id = ++seq.current;
    setMode('thinking'); setLine('Caut…');
    later(() => { if (seq.current === id) speak(answer()); }, 450);
  }, [speak]);

  const toggleVoice = () => setVoiceOn(on => {
    try { localStorage.setItem(VOICE_KEY, on ? 'off' : 'on'); } catch { /* blocked */ }
    if (on) try { speechSynthesis.cancel(); } catch { /* no speech api */ }
    return !on;
  });

  return { line, mode, voiceOn, speak, ask, toggleVoice, setLine };
}
