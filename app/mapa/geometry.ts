// ─────────────────────────────────────────────────────────────────────────────
//  Curve-based geometry for the Tocumen 3D map.
//
//  Each terminal is an extruded "ribbon" that follows its centre-line curve with
//  rounded end caps, so the footprint reads like the organic shape on the official
//  map rather than a rectangle. Gates become finger piers that stick out
//  perpendicular to the concourse, and POIs are positioned along the curve.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from "three";
import {
  SLAB_THICKNESS,
  TERMINALS,
  floorBaseY,
  type Poi,
  type TerminalId,
} from "./tocumenData";

const curveCache = new Map<TerminalId, THREE.CatmullRomCurve3>();
const ribbonCache = new Map<TerminalId, THREE.ExtrudeGeometry>();

/** Smooth centre-line curve of a terminal (y = 0 plane). */
export function terminalCurve(terminal: TerminalId): THREE.CatmullRomCurve3 {
  let curve = curveCache.get(terminal);
  if (!curve) {
    const pts = TERMINALS[terminal].centerline.map(
      ([x, z]) => new THREE.Vector3(x, 0, z),
    );
    curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
    curveCache.set(terminal, curve);
  }
  return curve;
}

/** Unit in-plane normal (left of travel direction) at parameter t ∈ [0,1]. */
function normalAt(curve: THREE.CatmullRomCurve3, t: number): THREE.Vector2 {
  const tan = curve.getTangentAt(THREE.MathUtils.clamp(t, 0, 1));
  const n = new THREE.Vector2(-tan.z, tan.x);
  return n.lengthSq() ? n.normalize() : new THREE.Vector2(0, 1);
}

/**
 * Extruded ribbon geometry for a terminal floor slab. The shape is built in the
 * XY plane (Y carries −z so that, after rotating the mesh −90° about X, the
 * footprint lands on the world XZ plane with the correct orientation) and
 * extruded upward by the slab thickness.
 */
export function terminalRibbonGeometry(terminal: TerminalId): THREE.ExtrudeGeometry {
  let geo = ribbonCache.get(terminal);
  if (geo) return geo;

  const curve = terminalCurve(terminal);
  const w = TERMINALS[terminal].width / 2;
  const N = 80; // samples along the curve
  const M = 14; // samples per rounded end cap

  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPointAt(t);
    const n = normalAt(curve, t);
    left.push(new THREE.Vector2(p.x + n.x * w, p.z + n.y * w));
    right.push(new THREE.Vector2(p.x - n.x * w, p.z - n.y * w));
  }

  const tanV = (t: number) => {
    const tg = curve.getTangentAt(THREE.MathUtils.clamp(t, 0, 1));
    return new THREE.Vector2(tg.x, tg.z).normalize();
  };
  const end = curve.getPointAt(1);
  const start = curve.getPointAt(0);
  const nEnd = normalAt(curve, 1);
  const nStart = normalAt(curve, 0);
  const tEnd = tanV(1);
  const tStart = tanV(0);

  const pts: THREE.Vector2[] = [];
  for (const p of left) pts.push(p);
  // east end cap: sweep left[N] → right[N] bulging along +tangent
  for (let s = 1; s < M; s++) {
    const phi = (Math.PI * s) / M;
    pts.push(
      new THREE.Vector2(
        end.x + Math.cos(phi) * nEnd.x * w + Math.sin(phi) * tEnd.x * w,
        end.z + Math.cos(phi) * nEnd.y * w + Math.sin(phi) * tEnd.y * w,
      ),
    );
  }
  for (let i = N; i >= 0; i--) pts.push(right[i]);
  // west end cap: sweep right[0] → left[0] bulging along −tangent
  for (let s = 1; s < M; s++) {
    const phi = (Math.PI * s) / M;
    pts.push(
      new THREE.Vector2(
        start.x - Math.cos(phi) * nStart.x * w - Math.sin(phi) * tStart.x * w,
        start.z - Math.cos(phi) * nStart.y * w - Math.sin(phi) * tStart.y * w,
      ),
    );
  }

  // Build shape in (x, −z) so the −90° X rotation restores +z orientation.
  const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, -p.y)));

  geo = new THREE.ExtrudeGeometry(shape, {
    depth: SLAB_THICKNESS,
    bevelEnabled: true,
    bevelThickness: 0.25,
    bevelSize: 0.35,
    bevelSegments: 2,
    curveSegments: 24,
  });
  ribbonCache.set(terminal, geo);
  return geo;
}

/** Curve midpoint (handy for labels / camera framing). */
export function terminalMidpoint(terminal: TerminalId): [number, number] {
  const p = terminalCurve(terminal).getPointAt(0.5);
  return [p.x, p.z];
}

export interface GateLayout {
  position: [number, number, number];
  /** Y-rotation so the finger points outward along the concourse normal. */
  rotationY: number;
}

/** Position + orientation of a gate finger along the terminal's airside edge. */
export function gateLayout(
  terminal: TerminalId,
  indexInTerminal: number,
  countInTerminal: number,
  y: number,
): GateLayout {
  const cfg = TERMINALS[terminal];
  const curve = terminalCurve(terminal);
  const w = cfg.width / 2;
  const frac = countInTerminal > 1 ? indexInTerminal / (countInTerminal - 1) : 0.5;
  const t = THREE.MathUtils.lerp(0.05, 0.95, frac);
  const p = curve.getPointAt(t);
  const n = normalAt(curve, t).multiplyScalar(cfg.gateSide);
  const x = p.x + n.x * (w + 1.8);
  const z = p.z + n.y * (w + 1.8);
  const rotationY = Math.atan2(n.x, n.y);
  return { position: [x, y, z], rotationY };
}

/** World position for a POI on top of its floor slab. */
export function poiPosition(poi: Poi): [number, number, number] {
  const cfg = TERMINALS[poi.terminal];
  const curve = terminalCurve(poi.terminal);
  const t = THREE.MathUtils.clamp((poi.u + 1) / 2, 0, 1);
  const p = curve.getPointAt(t);
  const n = normalAt(curve, t).multiplyScalar(poi.v * (cfg.width / 2) * 0.62);
  const y = floorBaseY(poi.floor) + SLAB_THICKNESS;
  return [p.x + n.x, y, p.z + n.y];
}

/** Curve running along the airside edge, used for the blue accent strip. */
export function airsideAccentCurve(terminal: TerminalId): THREE.CatmullRomCurve3 {
  const cfg = TERMINALS[terminal];
  const curve = terminalCurve(terminal);
  const w = cfg.width / 2 - 0.9;
  const pts: THREE.Vector3[] = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPointAt(t);
    const n = normalAt(curve, t).multiplyScalar(cfg.gateSide * w);
    pts.push(new THREE.Vector3(p.x + n.x, 0, p.z + n.y));
  }
  return new THREE.CatmullRomCurve3(pts);
}

/** Endpoints of the inter-terminal corridor (inner ends of each curve). */
export function connectorEndpoints(): { from: [number, number]; to: [number, number] } {
  const t1End = terminalCurve("T1").getPointAt(1);
  const t2Start = terminalCurve("T2").getPointAt(0);
  return { from: [t1End.x, t1End.z], to: [t2Start.x, t2Start.z] };
}
