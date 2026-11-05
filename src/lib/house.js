import * as THREE from 'three';

const ROOM_W = 4, ROOM_D = 3.5, GAP = .5;
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

const label = (text, color) => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const x = c.getContext('2d'); x.font = '600 46px Archivo, sans-serif'; x.fillStyle = color;
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, 48);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:new THREE.CanvasTexture(c), depthTest:false, transparent:true }));
  s.scale.set(3.2, .6, 1); s.renderOrder = 2;
  return s;
};

// Simple 3D floor plan: one floor slab per room, a box per piece of furniture, the highlighted one glows.
export function createHouse(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, .1, 200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, .95 * Math.PI));
  const sun = new THREE.DirectionalLight(0xffffff, .55 * Math.PI); sun.position.set(5, 10, 7); scene.add(sun);
  const group = new THREE.Group(); scene.add(group);
  const view = { theta:.7, phi:.95, dist:15, target:new THREE.Vector3(), lastHl:undefined };
  let last = { db:null, hl:null };

  const draw = () => {
    const t = view.target;
    cam.position.set(t.x + view.dist * Math.sin(view.phi) * Math.sin(view.theta), view.dist * Math.cos(view.phi), t.z + view.dist * Math.sin(view.phi) * Math.cos(view.theta));
    cam.lookAt(t); renderer.render(scene, cam);
  };

  const build = (db, hl) => {
    last = { db, hl };
    group.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); });
    group.clear();
    const found = css('--found');
    let target = null;
    db.rooms.forEach((r, i) => {
      const ox = i * (ROOM_W + GAP);
      const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, .06, ROOM_D), new THREE.MeshLambertMaterial({ color:css('--floor') }));
      floor.position.set(ox + ROOM_W / 2, -.03, ROOM_D / 2); group.add(floor);
      const lb = label(r.name, css('--muted')); lb.position.set(ox + ROOM_W / 2, .05, ROOM_D + .5); group.add(lb);
      db.furniture.filter(f => f.roomId === r.id).forEach(f => {
        const on = f.id === hl;
        const m = new THREE.Mesh(new THREE.BoxGeometry(f.w, f.h, f.d), new THREE.MeshLambertMaterial({
          color: on ? found : css('--furn'), emissive: on ? found : '#000000', emissiveIntensity: on ? .3 : 0 }));
        m.position.set(ox + f.x + f.w / 2, f.h / 2, f.z + f.d / 2); group.add(m);
        if (on) { const l = label(f.name, css('--fg')); l.position.set(m.position.x, f.h + .45, m.position.z); group.add(l); target = m.position.clone(); }
      });
    });
    if (view.lastHl !== hl) { view.dist = hl ? 9 : 15; view.lastHl = hl; }
    view.target = target ?? new THREE.Vector3(db.rooms.length * (ROOM_W + GAP) / 2, 0, ROOM_D / 2);
    draw();
  };

  let drag = null;
  const down = e => { drag = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); };
  const moveP = e => {
    if (!drag) return;
    view.theta -= (e.clientX - drag[0]) * .01;
    view.phi = Math.max(.25, Math.min(1.45, view.phi - (e.clientY - drag[1]) * .01));
    drag = [e.clientX, e.clientY]; draw();
  };
  const up = () => { drag = null; };
  const wheel = e => { e.preventDefault(); view.dist = Math.max(5, Math.min(40, view.dist + e.deltaY * .01)); draw(); };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', moveP);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('wheel', wheel, { passive:false });
  const ro = new ResizeObserver(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); draw();
  });
  ro.observe(canvas);
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const retheme = () => last.db && build(last.db, last.hl);
  mq.addEventListener('change', retheme);

  return {
    build,
    dispose() {
      ro.disconnect(); mq.removeEventListener('change', retheme);
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', moveP);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('wheel', wheel);
      renderer.dispose();
    }
  };
}
