import * as THREE from 'three';

// Ashima 3D simplex noise (MIT), used to bend the contour lines
const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 nm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=nm.x; p1*=nm.y; p2*=nm.z; p3*=nm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const VERTEX = `attribute float mouth; uniform float uMouth;
varying vec3 vPos; varying vec3 vN; varying vec3 vV;
void main(){
  vec3 p = position; p.y -= uMouth*.07*mouth; p.z -= uMouth*.025*mouth;
  vPos = position;
  vec4 mv = modelViewMatrix*vec4(p,1.);
  vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix*mv;
}`;

const FRAGMENT = NOISE + `
uniform float uTime; uniform float uGlow;
varying vec3 vPos; varying vec3 vN; varying vec3 vV;
void main(){
  vec3 N = normalize(vN), V = normalize(vV);
  float fld = vPos.y*17. + 2.4*snoise(vPos*1.4 + vec3(0.,0.,uTime*.06)) + .9*snoise(vPos*3.6 - uTime*.04);
  float d = abs(fract(fld)-.5), w = fwidth(fld);
  float line = 1. - smoothstep(.07, .07 + w*1.5, d);
  float dif = max(dot(N, normalize(vec3(.8,.3,.6))), 0.);
  float side = smoothstep(-.5, .6, N.x);
  vec3 base = vec3(.035,.05,.13) + vec3(.16,.32,.85)*pow(dif,1.4)*.85;
  vec3 hot = mix(vec3(1.,.2,.1), vec3(1.,.48,.26), dif);
  vec3 col = mix(base, base*.35, line*.6) + hot*line*(.6 + .35*(1.-side) + uGlow);
  float rim = pow(1. - max(dot(N,V),0.), 3.);
  col += rim*mix(vec3(1.,.25,.1), vec3(.3,.5,1.), side)*.7;
  gl_FragColor = vec4(col, 1.);
}`;

// Head scan (see scripts/head): positions, normals, mouth weights and indices in one small binary
async function loadHead(url = '/models/head.bytes') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Head model missing: ${url}`);
  const buf = await res.arrayBuffer(), dv = new DataView(buf);
  if (new TextDecoder().decode(new Uint8Array(buf, 0, 4)) !== 'JHD1') throw new Error('Not a JHD1 head file');
  const v = dv.getUint32(4, true), n = dv.getUint32(8, true);
  let o = 12;
  const take = (Type, count) => { const a = new Type(buf, o, count); o += count * Type.BYTES_PER_ELEMENT; return a; };
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(take(Float32Array, v * 3), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(take(Float32Array, v * 3), 3));
  geo.setAttribute('mouth', new THREE.BufferAttribute(take(Float32Array, v), 1));
  geo.setIndex(new THREE.BufferAttribute(take(Uint16Array, n), 1));
  return geo;
}

// resolves to a dispose function; state() returns { mode: 'idle'|'thinking'|'speaking', look: { x, y, active } } every frame
export async function createAvatar(canvas, state) {
  const headGeo = await loadHead();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 1, .1, 50);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime:{ value:0 }, uMouth:{ value:0 }, uGlow:{ value:0 } },
    vertexShader: VERTEX, fragmentShader: FRAGMENT
  });
  const head = new THREE.Group();
  head.add(new THREE.Mesh(headGeo, mat));
  head.rotation.y = 1.0;
  scene.add(head);

  let base = { x:.6, y:.05 };
  const ro = new ResizeObserver(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    const narrow = w / h < 1.1;
    base = narrow ? { x:0, y:.6 } : { x:.6, y:.05 };
    cam.position.set(0, 0, narrow ? 7.2 : 5.6);
  });
  ro.observe(canvas);

  let T = 0, last = performance.now(), mouthV = 0, glowV = 0, raf = 0;
  const loop = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const { mode, look } = state();
    const speaking = mode === 'speaking', thinking = mode === 'thinking';
    T += dt * (thinking ? 6 : 1) * (reduced ? .3 : 1);
    const t = now / 1000;
    const mouthTarget = speaking ? Math.max(0, .5 + .5 * Math.sin(t * 17) * (.6 + .4 * Math.sin(t * 5.3))) : 0;
    mouthV += (mouthTarget - mouthV) * .35;
    glowV += ((speaking ? .55 : thinking ? .3 : 0) - glowV) * .08;
    mat.uniforms.uTime.value = T; mat.uniforms.uMouth.value = mouthV; mat.uniforms.uGlow.value = glowV;
    head.position.set(base.x, base.y, 0);
    // tracking: turn to face the viewer; idle: rest in profile
    const ty = look.active ? look.x * .7 : 1.0 + (reduced ? 0 : Math.sin(t * .25) * .12);
    const tx = look.active ? look.y * .3 : (reduced ? 0 : Math.sin(t * .33) * .04);
    head.rotation.y += (ty - head.rotation.y) * (reduced ? .2 : .07);
    head.rotation.x += (tx - head.rotation.x) * (reduced ? .2 : .07);
    renderer.render(scene, cam);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => { cancelAnimationFrame(raf); ro.disconnect(); headGeo.dispose(); mat.dispose(); renderer.dispose(); };
}
