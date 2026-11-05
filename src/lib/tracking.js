// Webcam tracking: reports where the viewer is as { x, y } in -1..1 screen space (x mirrored, so your right is +x).
// shortcut: follows the centroid of motion, not a face; swap in MediaPipe Face Landmarker for real face/eye tracking.
export async function startTracking(onLook) {
  const stream = await navigator.mediaDevices.getUserMedia({ video:{ width:160, height:120, facingMode:'user' }, audio:false });
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.srcObject = stream;
  await video.play();
  const W = 48, H = 36, c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently:true });
  let prev = null, timer = 0, stopped = false;
  const tick = () => {
    if (stopped) return;
    ctx.drawImage(video, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data, g = new Uint8Array(W * H);
    for (let i = 0; i < g.length; i++) g[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
    if (prev) {
      let sx = 0, sy = 0, n = 0;
      for (let i = 0; i < g.length; i++) if (Math.abs(g[i] - prev[i]) > 25) { sx += i % W; sy += (i / W) | 0; n++; }
      if (n > 12) onLook({ x: -((sx / n) / (W - 1) * 2 - 1), y: (sy / n) / (H - 1) * 2 - 1 });
    }
    prev = g; timer = setTimeout(tick, 66);
  };
  tick();
  return () => { stopped = true; clearTimeout(timer); stream.getTracks().forEach(t => t.stop()); };
}
