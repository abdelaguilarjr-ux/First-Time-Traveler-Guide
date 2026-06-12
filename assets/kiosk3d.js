// ============================================================
// CWT Sato Travel — Section 05 · 3D Self Check-In Kiosk engine
// WebGL kiosk (GLB) + CSS3D screen mapped onto the tilted display.
// Scroll-driven storytelling with prev/next fallback. Calm motion.
// Shares the architecture of ci3d.js (Section 04).
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const D2R = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2);

export function initKiosk3D(opts){
  const stage   = document.getElementById('kkStage');
  const track   = document.getElementById('kkTrack');
  const glMount  = document.getElementById('kkGL');
  const cssMount = document.getElementById('kkCSS');
  const screenEl = document.getElementById('ksScreen');
  const loadEl   = document.getElementById('kkLoad');
  const N = opts.steps;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  // ---- tunable screen-mapping params ----
  const P = {
    baseYaw: 90,           // deg: rotate model so screen (+X) faces camera (+Z)
    meshName: 'G-Object001',
    zEpsilon: 0.02,        // outward push (device units) so the UI sits above the glass
    uiH: 1040,             // UI design height in px (fallback if screenEl has no layout)
    camZ: 9, fov: 30,
    // ---- reframe: crop to the kiosk's top half + center the display ----
    cropSpan: 2.2,         // world-units of model height shown vertically (model is 4 tall → ~top 55%)
    frameLift: 0.0,        // extra vertical nudge in world units (+ raises the kiosk)
  };
  // Viewport height in world units at the screen depth (depends only on fov + camZ).
  // Zoom the device so `cropSpan` worth of model height fills that height → the lower
  // pedestal falls off-frame and the tilted display sits centered ("aligned").
  P._frameScale = (2 * P.camZ * Math.tan((P.fov * D2R) / 2)) / P.cropSpan;
  P._screenY = 0;          // device-local Y of the display panel (set on model load)

  // ---- per-step poses (degrees yaw/pitch around the camera-facing kiosk / scale) ----
  const POSE = [
    { ry:  16, rx:-3, s:.96 },  // 1 find kiosk / welcome
    { ry:   6, rx:-1, s:1.02 }, // 2 identify
    { ry:   0, rx: 0, s:1.05 }, // 3 verify
    { ry:  -6, rx: 0, s:1.06 }, // 4 seat (hero)
    { ry:   4, rx: 0, s:1.02 }, // 5 bags
    { ry:  -4, rx:-2, s:1.05 }, // 6 print (hero)
    { ry:  10, rx: 0, s:.98 },  // 7 done
  ];

  let kioskX = 0, kioskY = 0, baseScale = 1, modelReady = false;
  const isWide = () => innerWidth > 920;

  // ---------- THREE setup ----------
  let renderer, css, scene, cssScene, camera, deviceWGL, shadowMat;
  try {
    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
  } catch(e){ return mountFallback(); }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  glMount.appendChild(renderer.domElement);

  css = new CSS3DRenderer();
  cssMount.appendChild(css.domElement);
  css.domElement.style.position = 'absolute';
  css.domElement.style.top = '0';
  css.domElement.style.left = '0';

  scene = new THREE.Scene();
  cssScene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(P.fov, 1, 0.01, 100);
  camera.position.set(0, 0, P.camZ);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;

  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdce9ff, 1.2); rim.position.set(5, 3, -4); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdd8e8, 0.75));

  deviceWGL = new THREE.Group(); scene.add(deviceWGL);

  // soft contact shadow
  const shCanvas = document.createElement('canvas'); shCanvas.width = shCanvas.height = 256;
  const sx = shCanvas.getContext('2d');
  const g = sx.createRadialGradient(128,128,10,128,128,128);
  g.addColorStop(0,'rgba(12,30,66,0.32)'); g.addColorStop(0.55,'rgba(12,30,66,0.11)'); g.addColorStop(1,'rgba(12,30,66,0)');
  sx.fillStyle = g; sx.fillRect(0,0,256,256);
  const shTex = new THREE.CanvasTexture(shCanvas);
  shadowMat = new THREE.MeshBasicMaterial({ map:shTex, transparent:true, depthWrite:false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.0), shadowMat);
  shadow.rotation.x = -Math.PI/2; shadow.position.y = -2.05; shadow.scale.set(1,1.1,1);
  deviceWGL.add(shadow);

  // ---------- CSS3D screen (mapped to the kiosk display via anchor) ----------
  const cssObj = new CSS3DObject(screenEl);
  cssObj.matrixAutoUpdate = false;
  cssScene.add(cssObj);
  const anchor = new THREE.Object3D();      // lives in deviceWGL, tracks the screen
  anchor.matrixAutoUpdate = true;
  deviceWGL.add(anchor);
  let anchorReady = false;

  // Derive the display face straight from the panel mesh geometry: position,
  // orientation and px→world scale are measured, not hand-tuned, so the CSS
  // screen lands exactly on the glass regardless of the model's node transforms.
  function placeAnchor(screenMesh){
    deviceWGL.updateWorldMatrix(true, true);
    const geo = screenMesh.geometry;
    geo.computeBoundingBox();
    const size = geo.boundingBox.getSize(new THREE.Vector3());
    const ctr  = geo.boundingBox.getCenter(new THREE.Vector3());
    const AX = { x: new THREE.Vector3(1,0,0), y: new THREE.Vector3(0,1,0), z: new THREE.Vector3(0,0,1) };
    const axes = ['x','y','z'].sort((a,b) => size[a] - size[b]);
    const nAxis = axes[0];                       // thinnest slab axis = screen normal
    const m3 = new THREE.Matrix3().setFromMatrix4(screenMesh.matrixWorld);
    const ctrW = ctr.clone().applyMatrix4(screenMesh.matrixWorld);
    const camW = camera.getWorldPosition(new THREE.Vector3());
    const nW = AX[nAxis].clone().transformDirection(screenMesh.matrixWorld);
    if (nW.dot(camW.sub(ctrW)) < 0) nW.negate(); // normal must face the camera
    // up = remaining axis closest to world +Y; right completes the basis
    let uAxis = axes[1], uW = AX[axes[1]].clone().transformDirection(screenMesh.matrixWorld);
    const alt = AX[axes[2]].clone().transformDirection(screenMesh.matrixWorld);
    if (Math.abs(alt.y) > Math.abs(uW.y)) { uAxis = axes[2]; uW = alt; }
    if (uW.y < 0) uW.negate();
    uW.addScaledVector(nW, -uW.dot(nW)).normalize();
    const rW = new THREE.Vector3().crossVectors(uW, nW).normalize();
    const worldQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(rW, uW, nW));
    // slab center pushed out to its front face
    const nLen = AX[nAxis].clone().applyMatrix3(m3).length();
    const faceW = ctrW.clone().addScaledVector(nW, size[nAxis] / 2 * nLen);
    // px → device-local scale, from the measured world height of the panel
    const uLen = AX[uAxis].clone().applyMatrix3(m3).length();
    const devScale = deviceWGL.getWorldScale(new THREE.Vector3()).x || 1;
    const hPx = screenEl.offsetHeight || P.uiH;
    anchor.position.copy(deviceWGL.worldToLocal(faceW));
    P._screenY = anchor.position.y;              // remember the panel height for reframing
    const dq = deviceWGL.getWorldQuaternion(new THREE.Quaternion());
    anchor.quaternion.copy(dq.invert().multiply(worldQ));
    anchor.scale.setScalar((size[uAxis] * uLen) / devScale / hPx);
    anchor.updateMatrix();
    anchor.translateZ(P.zEpsilon);               // keep the UI just above the glass
    anchor.updateMatrix();
    anchorReady = true;
  }

  // ---------- load GLB ----------
  new GLTFLoader().load(opts.model, (gltf) => {
    const m = gltf.scene;
    m.rotation.y = P.baseYaw * D2R;            // face the screen toward camera
    m.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const ctr  = box.getCenter(new THREE.Vector3());
    const s = 4.0 / size.y;                     // normalize height -> 4 units
    m.scale.setScalar(s);
    m.position.sub(ctr.clone().multiplyScalar(s));
    m.traverse(o => { if (o.isMesh){ o.castShadow = false; o.frustumCulled = false;
      if (o.material){ o.material.envMapIntensity = 1.2; } } });
    deviceWGL.add(m);
    m.updateWorldMatrix(true, true);
    // find screen mesh
    let screenMesh = null;
    m.traverse(o => { if (o.isMesh && o.name === P.meshName) screenMesh = o; });
    if (!screenMesh){ // fallback: topmost mesh by geometry bounds (the display panel)
      let topY = -1e9;
      m.traverse(o => { if (o.isMesh){ o.geometry.computeBoundingBox();
        const c = o.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld);
        if (c.y > topY){ topY = c.y; screenMesh = o; } } });
    }
    if (screenMesh) placeAnchor(screenMesh);
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
    if (w === 0 || h === 0) return;
    vw = w; vh = h;
    renderer.setSize(w, h); css.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // mobile: captions sit in a bottom band, so shrink the kiosk and lift it
    // into the clear upper area of the stage to avoid overlap
    kioskX = isWide() ? 1.15 : 0;
    kioskY = isWide() ? 0 : 1.12;
    baseScale = isWide() ? 1 : clamp(h/760, 0.62, 1) * 0.66;
  }
  addEventListener('resize', resize);
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---------- step state ----------
  let curStep = -1, stepF = 0;
  const cur = { rx:POSE[0].rx, ry:POSE[0].ry, s:POSE[0].s };

  function setStep(n){
    n = clamp(n, 1, N);
    if (n === curStep) return;
    curStep = n;
    opts.onStep && opts.onStep(n);
  }
  const api = {
    go(n){ const top = trackTop() + ((n-1)/(N-1)) * scrollSpan();
           scrollTo({ top, behavior: reduce ? 'auto':'smooth' }); },
    current(){ return curStep; },
    setStepDebug(n){ stepF = clamp(n-1, 0, N-1); setStep(n); }
  };

  function trackTop(){ return track.getBoundingClientRect().top + scrollY; }
  function scrollSpan(){ return track.offsetHeight - stage.clientHeight; }
  function onScroll(){
    const span = scrollSpan(); if (span <= 0) return;
    const p = clamp((scrollY - trackTop()) / span, 0, 1);
    stepF = p * (N - 1);
    setStep(Math.round(stepF) + 1);
  }
  addEventListener('scroll', onScroll, { passive:true });

  // ---------- render loop ----------
  let t0 = performance.now(), visible = true, raf = 0;
  function frame(now){
    raf = requestAnimationFrame(frame);
    if (vw === 0 || vh === 0) return;
    if (!visible) return;
    const t = (now - t0) / 1000;
    const i = clamp(Math.floor(stepF), 0, N-1), f = ease(clamp(stepF - i, 0, 1));
    const a = POSE[i], b = POSE[Math.min(i+1, N-1)];
    const tRy = lerp(a.ry, b.ry, f), tRx = lerp(a.rx, b.rx, f), tS = lerp(a.s, b.s, f);
    if (!reduce){ mx = lerp(mx, tmx, 0.05); my = lerp(my, tmy, 0.05); }
    cur.ry = lerp(cur.ry, tRy + mx*4, 0.08);
    cur.rx = lerp(cur.rx, tRx + -my*3, 0.08);
    cur.s  = lerp(cur.s, tS, 0.08);

    const floatY = reduce ? 0 : Math.sin(t*0.5) * 0.035;
    const floatZ = reduce ? 0 : Math.sin(t*0.38) * 0.003;
    const sc = baseScale * cur.s * P._frameScale;
    deviceWGL.rotation.set(cur.rx*D2R, cur.ry*D2R, floatZ);
    // recenter on the display panel so the top half fills the frame (lower pedestal cropped)
    deviceWGL.position.set(kioskX, floatY + P.frameLift + kioskY - P._screenY * sc, 0);
    deviceWGL.scale.setScalar(sc);
    shadowMat.opacity = 0.85 - Math.abs(cur.ry)/130;

    // sync CSS screen to the kiosk display
    if (anchorReady){
      deviceWGL.updateWorldMatrix(true, true);
      cssObj.matrix.copy(anchor.matrixWorld);
      cssObj.matrixWorld.copy(anchor.matrixWorld);
    }

    renderer.render(scene, camera);
    css.render(cssScene, camera);
  }
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

  function mountFallback(){ stage.classList.add('kk3d-noweb'); return { go(){}, current(){ return 1; } }; }
}
