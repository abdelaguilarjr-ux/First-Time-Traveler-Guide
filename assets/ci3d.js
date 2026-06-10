// ============================================================
// CWT Sato Travel — Section 04 · 3D Online Check-In engine
// WebGL phone hardware (GLB) + CSS3D screen overlay, locked together.
// Scroll-driven storytelling with prev/next fallback. Calm motion.
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const D2R = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2);

export function initCheckin3D(opts){
  const stage   = document.getElementById('ciStage');
  const track   = document.getElementById('ciTrack');
  const glMount  = document.getElementById('ciGL');
  const cssMount = document.getElementById('ciCSS');
  const screenEl = document.getElementById('psScreen');
  const loadEl   = document.getElementById('ciLoad');
  const N = opts.steps;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  // ---- per-step poses (degrees / scale). Subtle, calm. ----
  const POSE = [
    { ry: 15, rx:-4, s:.97 },  // 1 intro / lock
    { ry: 10, rx:-2, s:1.00 }, // 2 find trip
    { ry:  7, rx: 0, s:1.00 }, // 3 passport
    { ry:  0, rx: 0, s:1.07 }, // 4 seat map (hero)
    { ry: -8, rx: 0, s:1.00 }, // 5 baggage
    { ry: -3, rx:-3, s:1.05 }, // 6 boarding pass
    { ry:  7, rx: 0, s:1.00 }, // 7 save
    { ry:  0, rx: 0, s:1.03 }, // 8 ready
  ];

  let phoneX = 0, baseScale = 1, modelReady = false;
  const isWide = () => innerWidth > 920;

  // ---------- THREE setup ----------
  let renderer, css, scene, cssScene, camera, deviceWGL, deviceCSS, shadowMat;
  try {
    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
  } catch(e){ return mountFallback(); }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = false;
  glMount.appendChild(renderer.domElement);

  css = new CSS3DRenderer();
  cssMount.appendChild(css.domElement);
  css.domElement.style.position = 'absolute';
  css.domElement.style.top = '0';
  css.domElement.style.left = '0';

  scene = new THREE.Scene();
  cssScene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  camera.position.set(0, 0, 9);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;

  // lights — soft studio
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(-3, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdce9ff, 1.1); rim.position.set(5, 2, -4); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdd8e8, 0.7));

  deviceWGL = new THREE.Group(); scene.add(deviceWGL);
  deviceCSS = new THREE.Group(); cssScene.add(deviceCSS);

  // soft contact shadow (radial gradient sprite under phone)
  const shCanvas = document.createElement('canvas'); shCanvas.width = shCanvas.height = 256;
  const sx = shCanvas.getContext('2d');
  const g = sx.createRadialGradient(128,128,10,128,128,128);
  g.addColorStop(0,'rgba(12,30,66,0.34)'); g.addColorStop(0.55,'rgba(12,30,66,0.12)'); g.addColorStop(1,'rgba(12,30,66,0)');
  sx.fillStyle = g; sx.fillRect(0,0,256,256);
  const shTex = new THREE.CanvasTexture(shCanvas);
  shadowMat = new THREE.MeshBasicMaterial({ map:shTex, transparent:true, depthWrite:false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.2), shadowMat);
  shadow.rotation.x = -Math.PI/2; shadow.position.y = -2.55; shadow.scale.set(1,1.2,1);
  deviceWGL.add(shadow);

  // ---------- CSS3D screen ----------
  const SCREEN_PX_H = 852;
  const cssObj = new CSS3DObject(screenEl);
  const cssScale = 3.74 / SCREEN_PX_H;       // display height in world units
  cssObj.scale.setScalar(cssScale);
  cssObj.position.set(0, 0, 0.162);          // proud of the glass (+Z front)
  deviceCSS.add(cssObj);

  // ---------- load GLB ----------
  new GLTFLoader().load(opts.model, (gltf) => {
    const m = gltf.scene;
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const ctr  = box.getCenter(new THREE.Vector3());
    const s = 4.0 / size.y;                   // normalize height -> 4 units
    m.scale.setScalar(s);
    m.position.sub(ctr.clone().multiplyScalar(s));
    m.traverse(o => { if (o.isMesh){ o.castShadow = false; o.frustumCulled = false;
      if (o.material){ o.material.envMapIntensity = 1.15; } } });
    deviceWGL.add(m);
    modelReady = true;
    loadEl && loadEl.classList.add('gone');
  }, undefined, () => { loadEl && loadEl.classList.add('gone'); });

  // ---------- pointer parallax ----------
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  if (!reduce){
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      tmx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      tmy = ((e.clientY - r.top)  / r.height - 0.5) * 2;
    });
    stage.addEventListener('pointerleave', () => { tmx = 0; tmy = 0; });
  }

  // ---------- size ----------
  let vw = 0, vh = 0;
  function resize(){
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w === 0 || h === 0) return;          // ignore pre-layout (0-size) passes
    vw = w; vh = h;
    renderer.setSize(w, h); css.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    phoneX = isWide() ? 1.28 : 0;
    baseScale = isWide() ? 1 : clamp(h/720, 0.66, 1);
  }
  addEventListener('resize', resize);
  new ResizeObserver(resize).observe(stage);   // catches the first real layout
  resize();

  // ---------- step state ----------
  let curStep = -1, stepF = 0;
  const cur = { rx:POSE[0].rx, ry:POSE[0].ry, s:POSE[0].s };

  function setStep(n, fromUser){
    n = clamp(n, 1, N);
    if (n === curStep) return;
    curStep = n;
    opts.onStep && opts.onStep(n);
  }
  // expose for buttons / dots
  const api = {
    go(n){ const top = trackTop() + ((n-1)/(N-1)) * scrollSpan();
           scrollTo({ top, behavior: reduce ? 'auto':'smooth' }); },
    current(){ return curStep; },
    setStepDebug(n){ stepF = clamp(n-1, 0, N-1); setStep(n); }
  };

  function trackTop(){ return track.getBoundingClientRect().top + scrollY; }
  function stageH(){ return stage.clientHeight; }
  function scrollSpan(){ return track.offsetHeight - stageH(); }

  function onScroll(){
    const span = scrollSpan(); if (span <= 0) return;
    const p = clamp((scrollY - trackTop()) / span, 0, 1);
    stepF = p * (N - 1);
    setStep(Math.round(stepF) + 1);
  }
  addEventListener('scroll', onScroll, { passive:true });

  // ---------- render loop (always-on RAF; render gated on visibility) ----------
  let t0 = performance.now(), visible = true, raf = 0;
  function frame(now){
    raf = requestAnimationFrame(frame);
    if (vw === 0 || vh === 0) return;          // wait for layout
    if (!visible) return;                       // off-screen: skip render cost, keep RAF alive
    const t = (now - t0) / 1000;
    // pose blend along stepF for buttery camera
    const i = clamp(Math.floor(stepF), 0, N-1), f = ease(clamp(stepF - i, 0, 1));
    const a = POSE[i], b = POSE[Math.min(i+1, N-1)];
    const tRy = lerp(a.ry, b.ry, f), tRx = lerp(a.rx, b.rx, f), tS = lerp(a.s, b.s, f);
    if (!reduce){ mx = lerp(mx, tmx, 0.05); my = lerp(my, tmy, 0.05); }
    cur.ry = lerp(cur.ry, tRy + mx*5, 0.08);
    cur.rx = lerp(cur.rx, tRx + -my*4, 0.08);
    cur.s  = lerp(cur.s, tS, 0.08);

    const floatY = reduce ? 0 : Math.sin(t*0.55) * 0.05;
    const floatZ = reduce ? 0 : Math.sin(t*0.4) * 0.004;
    const sc = baseScale * cur.s;
    for (const grp of [deviceWGL, deviceCSS]){
      grp.rotation.set(cur.rx*D2R, cur.ry*D2R, floatZ);
      grp.position.set(phoneX, floatY, 0);
      grp.scale.setScalar(sc);
    }
    shadowMat.opacity = 0.9 - Math.abs(cur.ry)/120;

    renderer.render(scene, camera);
    css.render(cssScene, camera);
  }

  // cheap visibility gate — recomputed when scrolling, not per-frame layout thrash
  function updateVisible(){
    const r = stage.getBoundingClientRect();
    visible = r.bottom > 0 && r.top < innerHeight;
  }
  addEventListener('scroll', updateVisible, { passive:true });
  updateVisible();
  raf = requestAnimationFrame(frame);

  onScroll();
  setStep(1);
  return api;

  // ---------- fallback (no WebGL) ----------
  function mountFallback(){
    stage.classList.add('ci3d-noweb');
    return { go(){}, current(){ return 1; } };
  }
}
