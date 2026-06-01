"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

import {
  CATEGORY_STYLES,
  POIS,
  SLAB_THICKNESS,
  TERMINALS,
  gatesForTerminal,
  floorBaseY,
  type FloorId,
  type Poi,
  type TerminalId,
} from "./tocumenData";
import {
  airsideAccentCurve,
  connectorEndpoints,
  gateLayout,
  poiPosition,
  terminalMidpoint,
  terminalRibbonGeometry,
} from "./geometry";

export type Focus = "all" | TerminalId;

export interface MapSelection {
  focus: Focus;
  activeFloor: FloorId;
  selectedGate: string | null;
  selectedPoiId: string | null;
  highlightGates: Set<string>;
  highlightPois: Set<string>;
}

interface SceneProps extends MapSelection {
  onSelectGate: (gate: string | null) => void;
  onSelectPoi: (id: string | null) => void;
}

const BRAND = "#1466B8";
const ACCENT = "#EE7D22";

// ── Camera rig ──────────────────────────────────────────────────────────────────
function CameraRig({ focus, activeFloor, selectedGate }: MapSelection) {
  const { camera } = useThree();
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const wantPos = useRef(new THREE.Vector3(0, 78, 118));
  const wantTarget = useRef(new THREE.Vector3(0, 4, 0));
  const animUntil = useRef(0);

  useEffect(() => {
    const focusY = floorBaseY(activeFloor) + 2;

    if (selectedGate) {
      const list = gatesForTerminal(selectedGate.startsWith("2") ? "T2" : "T1");
      const term: TerminalId = selectedGate.startsWith("2") ? "T2" : "T1";
      const idx = gatesForTerminal(term).indexOf(selectedGate);
      if (idx >= 0) {
        const { position } = gateLayout(term, idx, list.length, focusY);
        wantPos.current.set(position[0], focusY + 22, position[2] + 32);
        wantTarget.current.set(position[0], focusY, position[2]);
      }
    } else if (focus === "all") {
      wantPos.current.set(0, 86, 124);
      wantTarget.current.set(0, 2, 0);
    } else {
      const c = TERMINALS[focus].center;
      wantPos.current.set(c[0] - 2, 52, c[1] + 74);
      wantTarget.current.set(c[0], focusY, c[1]);
    }
    animUntil.current = performance.now() + 1400;
  }, [focus, activeFloor, selectedGate]);

  useFrame(() => {
    if (performance.now() < animUntil.current && controls.current) {
      camera.position.lerp(wantPos.current, 0.055);
      controls.current.target.lerp(wantTarget.current, 0.055);
      controls.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={22}
      maxDistance={240}
      maxPolarAngle={Math.PI / 2.15}
      target={[0, 4, 0]}
    />
  );
}

// ── Floor slab (extruded curved ribbon) ─────────────────────────────────────────
function FloorSlab({
  terminal,
  floor,
  active,
  ghost,
}: {
  terminal: TerminalId;
  floor: FloorId;
  active: boolean;
  ghost: boolean;
}) {
  const geo = useMemo(() => terminalRibbonGeometry(terminal), [terminal]);
  const accent = useMemo(() => airsideAccentCurve(terminal), [terminal]);
  const baseY = floorBaseY(floor);
  const opacity = ghost ? 0.13 : active ? 1 : 0.32;
  const [mx, mz] = terminalMidpoint(terminal);

  return (
    <group>
      <mesh
        geometry={geo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, baseY, 0]}
        castShadow={active}
        receiveShadow
      >
        <meshStandardMaterial
          color={active ? "#eef2f7" : "#c7ced8"}
          roughness={0.82}
          metalness={0.04}
          transparent
          opacity={opacity}
          emissive={active ? BRAND : "#000000"}
          emissiveIntensity={active ? 0.05 : 0}
        />
      </mesh>

      {/* Airside accent strip following the concourse curve */}
      {!ghost && (
        <mesh position={[0, baseY + SLAB_THICKNESS + 0.32, 0]}>
          <tubeGeometry args={[accent, 64, 0.32, 8, false]} />
          <meshStandardMaterial
            color={BRAND}
            roughness={0.5}
            transparent
            opacity={active ? 0.95 : 0.35}
          />
        </mesh>
      )}

      {/* Information rotunda landmark */}
      {!ghost && (
        <mesh position={[mx, baseY + SLAB_THICKNESS + 0.45, mz]} castShadow={active}>
          <cylinderGeometry args={[2.6, 2.6, 0.9, 44]} />
          <meshStandardMaterial
            color={active ? "#dbe4ef" : "#bcc4cf"}
            transparent
            opacity={opacity}
            roughness={0.7}
          />
        </mesh>
      )}
    </group>
  );
}

// ── Gate marker (finger pier + pin) ─────────────────────────────────────────────
function GateMarker({
  number,
  position,
  rotationY,
  showLabel,
  selected,
  highlighted,
  onSelect,
}: {
  number: string;
  position: [number, number, number];
  rotationY: number;
  showLabel: boolean;
  selected: boolean;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const emphasised = selected || highlighted;
  const color = selected ? ACCENT : highlighted ? "#10b981" : BRAND;
  const scale = emphasised ? 1.5 : 1;

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* finger pier reaching back into the concourse (local −z) */}
      <mesh position={[0, 0.2, -1.2]} castShadow>
        <boxGeometry args={[1.1, 0.5, 2.6]} />
        <meshStandardMaterial color="#9aa6b4" roughness={0.8} />
      </mesh>
      {/* pylon */}
      <mesh position={[0, 1.2 * scale, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 2.4 * scale, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* head */}
      <mesh position={[0, 2.5 * scale, 0]} castShadow>
        <sphereGeometry args={[0.55 * scale, 20, 20]} />
        <meshStandardMaterial
          color={color}
          roughness={0.35}
          metalness={0.2}
          emissive={emphasised ? color : "#000000"}
          emissiveIntensity={emphasised ? 0.5 : 0}
        />
      </mesh>
      {showLabel && (
        <Html
          position={[0, 3.4 * scale, 0]}
          center
          distanceFactor={48}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: emphasised ? color : "#ffffff",
              color: emphasised ? "#ffffff" : "#0C2A4D",
              border: `2px solid ${color}`,
              borderRadius: 9,
              padding: "2px 7px",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: "var(--font-outfit), system-ui, sans-serif",
              boxShadow: "0 3px 10px rgba(8,30,60,0.22)",
              whiteSpace: "nowrap",
            }}
          >
            {number}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── POI marker ──────────────────────────────────────────────────────────────────
function PoiMarker({
  poi,
  selected,
  highlighted,
  onSelect,
}: {
  poi: Poi;
  selected: boolean;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const [x, y, z] = poiPosition(poi);
  const style = CATEGORY_STYLES[poi.category];
  const emphasised = selected || highlighted;
  const headY = 3.6;

  return (
    <group position={[x, y, z]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <mesh position={[0, headY / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, headY, 10]} />
        <meshStandardMaterial color="#7c8794" roughness={0.8} />
      </mesh>
      <mesh position={[0, headY, 0]} castShadow scale={emphasised ? 1.25 : 1}>
        <sphereGeometry args={[0.9, 24, 24]} />
        <meshStandardMaterial
          color={style.color}
          roughness={0.3}
          metalness={0.15}
          emissive={style.color}
          emissiveIntensity={emphasised ? 0.55 : 0.12}
        />
      </mesh>
      <Html
        position={[0, headY, 0]}
        center
        distanceFactor={50}
        zIndexRange={[30, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#ffffff",
              display: "grid",
              placeItems: "center",
              fontSize: 15,
              boxShadow: `0 0 0 2px ${style.color}`,
            }}
          >
            {style.glyph}
          </div>
          <div
            style={{
              background: emphasised ? style.color : "rgba(255,255,255,0.95)",
              color: emphasised ? "#fff" : "#0C2A4D",
              borderRadius: 7,
              padding: "2px 7px",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-outfit), system-ui, sans-serif",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(8,30,60,0.18)",
            }}
          >
            {poi.es}
          </div>
        </div>
      </Html>
    </group>
  );
}

// ── Big terminal label (overview) ───────────────────────────────────────────────
function TerminalLabel({ terminal }: { terminal: TerminalId }) {
  const [mx, mz] = terminalMidpoint(terminal);
  return (
    <Html
      position={[mx, 15, mz - 10]}
      center
      distanceFactor={120}
      zIndexRange={[5, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          color: "#0C2A4D",
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: "-0.02em",
          fontFamily: "var(--font-outfit), system-ui, sans-serif",
          textShadow: "0 2px 14px rgba(255,255,255,0.85)",
          whiteSpace: "nowrap",
        }}
      >
        {TERMINALS[terminal].name}
      </div>
    </Html>
  );
}

// ── Inter-terminal corridor ─────────────────────────────────────────────────────
function Connector() {
  const { from, to } = connectorEndpoints();
  const mx = (from[0] + to[0]) / 2;
  const mz = (from[1] + to[1]) / 2;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  return (
    <mesh position={[mx, SLAB_THICKNESS / 2, mz]} rotation={[0, angle, 0]} receiveShadow>
      <boxGeometry args={[5, SLAB_THICKNESS * 0.7, len]} />
      <meshStandardMaterial color="#b7c0cb" roughness={0.85} />
    </mesh>
  );
}

// ── Scene root ──────────────────────────────────────────────────────────────────
export default function MapScene(props: SceneProps) {
  const {
    focus,
    activeFloor,
    selectedGate,
    selectedPoiId,
    highlightGates,
    highlightPois,
    onSelectGate,
    onSelectPoi,
  } = props;

  const renderPlan = useMemo(() => {
    if (focus === "all") {
      return (Object.keys(TERMINALS) as TerminalId[]).map((id) => ({
        terminal: id,
        floors: [100 as FloorId],
        ghost: false,
        labelGates: false,
      }));
    }
    const other = (Object.keys(TERMINALS) as TerminalId[]).filter((id) => id !== focus);
    return [
      { terminal: focus, floors: TERMINALS[focus].floors, ghost: false, labelGates: true },
      ...other.map((id) => ({
        terminal: id,
        floors: [100 as FloorId],
        ghost: true,
        labelGates: false,
      })),
    ];
  }, [focus]);

  return (
    <>
      <CameraRig {...props} />

      <hemisphereLight args={["#ffffff", "#9fb0c4", 0.85]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[40, 70, 40]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
      />
      <directionalLight position={[-50, 30, -20]} intensity={0.3} color="#bcd2ff" />

      <mesh
        position={[0, -0.6, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMissed={() => {
          onSelectGate(null);
          onSelectPoi(null);
        }}
      >
        <planeGeometry args={[460, 460]} />
        <meshStandardMaterial color="#eaf1f8" roughness={1} />
      </mesh>

      <ContactShadows position={[0, 0.02, 0]} scale={300} far={40} blur={2.4} opacity={0.3} resolution={1024} />

      <Connector />

      {renderPlan.map((plan) =>
        plan.floors.map((floor) => {
          const isActive = !plan.ghost && (focus === "all" || floor === activeFloor);
          const [wx, wz] = terminalMidpoint(plan.terminal);
          const showGatesHere =
            !plan.ghost && (focus === "all" ? floor === 100 : floor === activeFloor);
          const gateY = floorBaseY(focus === "all" ? 100 : activeFloor) + SLAB_THICKNESS;
          const gateList = gatesForTerminal(plan.terminal);

          return (
            <group key={`${plan.terminal}-${floor}`}>
              <FloorSlab
                terminal={plan.terminal}
                floor={floor}
                active={isActive}
                ghost={plan.ghost}
              />

              {!plan.ghost && focus !== "all" && (
                <Html
                  position={[wx, floorBaseY(floor) + 1, wz + 10]}
                  center
                  distanceFactor={70}
                  zIndexRange={[8, 0]}
                  style={{ pointerEvents: "none" }}
                >
                  <div
                    style={{
                      color: floor === activeFloor ? BRAND : "#5b6b7d",
                      fontWeight: 700,
                      fontSize: 13,
                      opacity: floor === activeFloor ? 1 : 0.5,
                      fontFamily: "var(--font-outfit), system-ui, sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Nivel {floor}
                  </div>
                </Html>
              )}

              {showGatesHere &&
                gateList.map((number, i) => {
                  const { position, rotationY } = gateLayout(plan.terminal, i, gateList.length, gateY);
                  return (
                    <GateMarker
                      key={number}
                      number={number}
                      position={position}
                      rotationY={rotationY}
                      showLabel={plan.labelGates}
                      selected={selectedGate === number}
                      highlighted={highlightGates.has(number)}
                      onSelect={() => onSelectGate(number)}
                    />
                  );
                })}
            </group>
          );
        }),
      )}

      {focus !== "all" &&
        POIS.filter((p) => p.terminal === focus && p.floor === activeFloor).map((poi) => (
          <PoiMarker
            key={poi.id}
            poi={poi}
            selected={selectedPoiId === poi.id}
            highlighted={highlightPois.has(poi.id)}
            onSelect={() => onSelectPoi(poi.id)}
          />
        ))}

      {focus === "all" &&
        (Object.keys(TERMINALS) as TerminalId[]).map((id) => (
          <TerminalLabel key={id} terminal={id} />
        ))}
    </>
  );
}
