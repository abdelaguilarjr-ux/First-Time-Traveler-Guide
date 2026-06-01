"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, RoundedBox, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

import {
  CATEGORY_STYLES,
  FLOOR_GAP,
  GATES,
  POIS,
  SLAB_THICKNESS,
  TERMINALS,
  gatePosition,
  gatesForTerminal,
  poiPosition,
  floorBaseY,
  type FloorId,
  type Poi,
  type TerminalId,
} from "./tocumenData";

export type Focus = "all" | TerminalId;

export interface MapSelection {
  focus: Focus;
  activeFloor: FloorId;
  selectedGate: string | null;
  selectedPoiId: string | null;
  /** ids/numbers matched by the search box, highlighted in the scene. */
  highlightGates: Set<string>;
  highlightPois: Set<string>;
}

interface SceneProps extends MapSelection {
  onSelectGate: (gate: string | null) => void;
  onSelectPoi: (id: string | null) => void;
}

const BRAND = "#1466B8";
const ACCENT = "#EE7D22";

// ── Camera rig: glides toward the focused terminal / floor / gate ──────────────
function CameraRig({ focus, activeFloor, selectedGate }: MapSelection) {
  const { camera } = useThree();
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const wantPos = useRef(new THREE.Vector3(0, 78, 118));
  const wantTarget = useRef(new THREE.Vector3(0, 4, 0));
  const animUntil = useRef(0);

  useEffect(() => {
    const focusY = floorBaseY(activeFloor) + 2;

    if (selectedGate) {
      const gate = GATES.find((g) => g.number === selectedGate);
      if (gate) {
        const list = gatesForTerminal(gate.terminal);
        const idx = list.indexOf(gate.number);
        const [gx, , gz] = gatePosition(gate.terminal, idx, list.length, focusY);
        wantPos.current.set(gx, focusY + 20, gz + 30);
        wantTarget.current.set(gx, focusY, gz);
      }
    } else if (focus === "all") {
      wantPos.current.set(0, 82, 122);
      wantTarget.current.set(0, 4, 0);
    } else {
      const t = TERMINALS[focus];
      wantPos.current.set(t.center[0] - 4, 50, t.center[1] + 70);
      wantTarget.current.set(t.center[0], focusY, t.center[1] - 2);
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
      maxDistance={220}
      maxPolarAngle={Math.PI / 2.15}
      target={[0, 4, 0]}
    />
  );
}

// ── A single floor slab ────────────────────────────────────────────────────────
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
  const t = TERMINALS[terminal];
  const y = floorBaseY(floor) + SLAB_THICKNESS / 2;
  const opacity = ghost ? 0.14 : active ? 1 : 0.34;

  return (
    <group>
      <RoundedBox
        args={[t.length, SLAB_THICKNESS, t.depth]}
        radius={0.45}
        smoothness={4}
        position={[t.center[0], y, t.center[1]]}
        castShadow={active}
        receiveShadow
      >
        <meshStandardMaterial
          color={active ? "#eef2f7" : "#c7ced8"}
          roughness={0.85}
          metalness={0.05}
          transparent
          opacity={opacity}
          emissive={active ? BRAND : "#000000"}
          emissiveIntensity={active ? 0.04 : 0}
        />
      </RoundedBox>

      {/* Airside accent strip (where the gates are) */}
      {!ghost && (
        <mesh
          position={[t.center[0], y + SLAB_THICKNESS / 2 + 0.01, t.center[1] - t.depth / 2 + 1.1]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[t.length - 2, 1.6]} />
          <meshStandardMaterial
            color={BRAND}
            transparent
            opacity={active ? 0.9 : 0.3}
            roughness={0.6}
          />
        </mesh>
      )}

      {/* Information rotunda landmark */}
      {!ghost && (
        <mesh position={[t.center[0], y + SLAB_THICKNESS / 2 + 0.4, t.center[1] + 1]} castShadow={active}>
          <cylinderGeometry args={[2.4, 2.4, 0.8, 40]} />
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

// ── Gate marker ─────────────────────────────────────────────────────────────────
function GateMarker({
  terminal,
  number,
  position,
  showLabel,
  selected,
  highlighted,
  onSelect,
}: {
  terminal: TerminalId;
  number: string;
  position: [number, number, number];
  showLabel: boolean;
  selected: boolean;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const [x, y, z] = position;
  const emphasised = selected || highlighted;
  const color = selected ? ACCENT : highlighted ? "#10b981" : BRAND;
  const scale = emphasised ? 1.5 : 1;

  return (
    <group position={[x, y, z]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* jet-bridge nub linking to the slab */}
      <mesh position={[0, 0.2, 0.9]}>
        <boxGeometry args={[1, 0.4, 1.8]} />
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

// ── Point-of-interest marker (pin) ──────────────────────────────────────────────
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
      {/* pole */}
      <mesh position={[0, headY / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, headY, 10]} />
        <meshStandardMaterial color="#7c8794" roughness={0.8} />
      </mesh>
      {/* pin head */}
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

// ── Big floating terminal label (overview mode) ─────────────────────────────────
function TerminalLabel({ terminal }: { terminal: TerminalId }) {
  const t = TERMINALS[terminal];
  return (
    <Html
      position={[t.center[0], 14, t.center[1]]}
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
        {t.name}
      </div>
    </Html>
  );
}

// ── Connector corridor between the two terminals ────────────────────────────────
function Connector() {
  const x1 = TERMINALS.T1.center[0] + TERMINALS.T1.length / 2;
  const x2 = TERMINALS.T2.center[0] - TERMINALS.T2.length / 2;
  const mid = (x1 + x2) / 2;
  const len = x2 - x1;
  return (
    <mesh position={[mid, SLAB_THICKNESS / 2, 0]} receiveShadow>
      <boxGeometry args={[len, SLAB_THICKNESS * 0.7, 5]} />
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

  // Which terminals/floors to render.
  const renderPlan = useMemo(() => {
    if (focus === "all") {
      return (Object.keys(TERMINALS) as TerminalId[]).map((id) => ({
        terminal: id,
        floors: [100 as FloorId],
        ghost: false,
        labelGates: false,
        showPois: false,
        bigLabel: true,
      }));
    }
    const other = (Object.keys(TERMINALS) as TerminalId[]).filter((id) => id !== focus);
    return [
      {
        terminal: focus,
        floors: TERMINALS[focus].floors,
        ghost: false,
        labelGates: true,
        showPois: true,
        bigLabel: false,
      },
      ...other.map((id) => ({
        terminal: id,
        floors: [100 as FloorId],
        ghost: true,
        labelGates: false,
        showPois: false,
        bigLabel: false,
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
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
      />
      <directionalLight position={[-50, 30, -20]} intensity={0.3} color="#bcd2ff" />

      {/* click empty space to deselect */}
      <mesh
        position={[0, -0.6, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMissed={() => {
          onSelectGate(null);
          onSelectPoi(null);
        }}
      >
        <planeGeometry args={[420, 420]} />
        <meshStandardMaterial color="#eaf1f8" roughness={1} />
      </mesh>

      <ContactShadows
        position={[0, 0.02, 0]}
        scale={260}
        far={40}
        blur={2.4}
        opacity={0.32}
        resolution={1024}
      />

      <Connector />

      {renderPlan.map((plan) =>
        plan.floors.map((floor) => {
          const isActive = !plan.ghost && (focus === "all" || floor === activeFloor);
          const t = TERMINALS[plan.terminal];

          // gates render at the active floor height (or ground in overview)
          const gateY =
            floorBaseY(focus === "all" ? 100 : activeFloor) + SLAB_THICKNESS;
          const gateList = gatesForTerminal(plan.terminal);

          return (
            <group key={`${plan.terminal}-${floor}`}>
              <FloorSlab
                terminal={plan.terminal}
                floor={floor}
                active={isActive}
                ghost={plan.ghost}
              />

              {/* Floor label on focused terminal */}
              {!plan.ghost && focus !== "all" && (
                <Html
                  position={[t.center[0] - t.length / 2 - 1, floorBaseY(floor) + 1, t.center[1]]}
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
                    {floor}
                  </div>
                </Html>
              )}

              {/* Gates — only on the lowest rendered floor of each terminal */}
              {!plan.ghost && (focus === "all" ? floor === 100 : floor === activeFloor) &&
                gateList.map((number, i) => (
                  <GateMarker
                    key={number}
                    terminal={plan.terminal}
                    number={number}
                    position={gatePosition(plan.terminal, i, gateList.length, gateY)}
                    showLabel={plan.labelGates}
                    selected={selectedGate === number}
                    highlighted={highlightGates.has(number)}
                    onSelect={() => onSelectGate(number)}
                  />
                ))}
            </group>
          );
        }),
      )}

      {/* POIs for the active terminal + floor */}
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

      {/* Big terminal names in overview */}
      {focus === "all" &&
        (Object.keys(TERMINALS) as TerminalId[]).map((id) => (
          <TerminalLabel key={id} terminal={id} />
        ))}
    </>
  );
}
