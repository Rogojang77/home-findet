// Mounts the Unity WebGL build of Jarvis (unity/JarvisAvatar, menu Jarvis → Build WebGL).
// Rejects when no build is in public/unity, so the caller can fall back to the three.js head.
const BUILD = '/unity/Build/unity';

const loadScript = src => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src; s.onload = resolve; s.onerror = reject;
  document.body.append(s);
});

// same interface as createAvatar: state() → { mode, look }, resolves to a dispose function
export async function createUnityAvatar(canvas, state) {
  if (!window.createUnityInstance) await loadScript(`${BUILD}.loader.js`);
  if (!window.createUnityInstance) throw new Error('No Unity build in public/unity');
  const unity = await window.createUnityInstance(canvas, {
    dataUrl:`${BUILD}.data`, frameworkUrl:`${BUILD}.framework.js`, codeUrl:`${BUILD}.wasm`,
    companyName:'Home Finder', productName:'Jarvis', productVersion:'0.1'
  });
  const sent = {};
  const send = (method, value) => { if (sent[method] !== value) { sent[method] = value; unity.SendMessage('Jarvis', method, value); } };
  let raf = 0;
  const loop = () => {
    const { mode, look } = state();
    send('SetMode', mode);
    send('SetLook', look.active ? `${look.x.toFixed(3)},${look.y.toFixed(3)}` : 'off');
    raf = requestAnimationFrame(loop);
  };
  loop();
  return () => { cancelAnimationFrame(raf); unity.Quit(); };
}
