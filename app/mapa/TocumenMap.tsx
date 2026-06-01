"use client";

import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";

import MapScene, { type Focus } from "./MapScene";
import {
  AIRLINES,
  CATEGORY_STYLES,
  FLOOR_LABELS,
  GATES,
  POIS,
  TERMINALS,
  gatesForTerminal,
  type FloorId,
  type PoiCategory,
  type TerminalId,
} from "./tocumenData";

const BRAND = "#1466B8";
const FLOORS: FloorId[] = [100, 200, 300];

// Legend grouped by signage colour.
const LEGEND: { color: string; label: string; cats: PoiCategory[] }[] = [
  { color: "#1466B8", label: "Servicios", cats: ["checkin", "vip", "carRental", "shuttle", "bank", "food"] },
  { color: "#F2B705", label: "Áreas controladas", cats: ["immigration", "customs", "baggage", "security"] },
  { color: "#EE7D22", label: "Información", cats: ["information"] },
  { color: "#2FA84F", label: "Transporte", cats: ["taxi"] },
  { color: "#D64541", label: "Emergencia", cats: ["clinic"] },
];

export default function TocumenMap() {
  const [focus, setFocus] = useState<Focus>("all");
  const [activeFloor, setActiveFloor] = useState<FloorId>(200);
  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // ── Search highlighting ──
  const { highlightGates, highlightPois } = useMemo(() => {
    const g = new Set<string>();
    const p = new Set<string>();
    const q = query.trim().toLowerCase();
    if (q.length) {
      for (const gate of GATES) if (gate.number.toLowerCase().includes(q)) g.add(gate.number);
      for (const poi of POIS) {
        if (poi.es.toLowerCase().includes(q) || poi.en.toLowerCase().includes(q)) p.add(poi.id);
      }
    }
    return { highlightGates: g, highlightPois: p };
  }, [query]);

  // ── Handlers ──
  function chooseTerminal(f: Focus) {
    setFocus(f);
    setSelectedGate(null);
    setSelectedPoiId(null);
  }

  function chooseGate(num: string | null) {
    setSelectedPoiId(null);
    setSelectedGate(num);
    if (num) {
      const gate = GATES.find((x) => x.number === num);
      if (gate) setFocus(gate.terminal);
    }
  }

  function choosePoi(id: string | null) {
    setSelectedGate(null);
    setSelectedPoiId(id);
    if (id) {
      const poi = POIS.find((x) => x.id === id);
      if (poi) {
        setFocus(poi.terminal);
        setActiveFloor(poi.floor);
      }
    }
  }

  const selectedPoi = selectedPoiId ? POIS.find((p) => p.id === selectedPoiId) : null;
  const selectedGateObj = selectedGate ? GATES.find((g) => g.number === selectedGate) : null;

  // Gate options for the dropdown (all, or focused terminal).
  const gateOptions = useMemo(() => {
    if (focus === "all") return GATES.map((g) => g.number);
    return gatesForTerminal(focus);
  }, [focus]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#eaf2fb] to-[#d6e2f0]">
      <Canvas
        shadows
        camera={{ position: [0, 82, 122], fov: 45, near: 0.1, far: 1000 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <MapScene
            focus={focus}
            activeFloor={activeFloor}
            selectedGate={selectedGate}
            selectedPoiId={selectedPoiId}
            highlightGates={highlightGates}
            highlightPois={highlightPois}
            onSelectGate={chooseGate}
            onSelectPoi={choosePoi}
          />
        </Suspense>
      </Canvas>

      {/* ── Title ── */}
      <div className="pointer-events-none absolute left-5 top-5 max-w-sm">
        <h1 className="text-lg font-extrabold leading-tight text-[#0C2A4D] md:text-2xl">
          Aeropuerto Internacional de Tocumen
        </h1>
        <p className="text-xs font-medium text-[#0C2A4D]/60 md:text-sm">
          Mapa 3D interactivo · Guía de terminales y gates
        </p>
      </div>

      {/* ── Control panel ── */}
      <div className="absolute right-4 top-4 w-[260px] rounded-2xl bg-white/90 p-4 shadow-xl shadow-sky-900/10 backdrop-blur-md">
        {/* Terminal selector */}
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0C2A4D]/50">
          Terminal
        </p>
        <div className="mb-4 grid grid-cols-3 gap-1.5">
          {([["all", "Todo"], ["T1", "T1"], ["T2", "T2"]] as [Focus, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => chooseTerminal(id)}
              className={`rounded-lg py-1.5 text-sm font-semibold transition-colors ${
                focus === id
                  ? "bg-[#1466B8] text-white"
                  : "bg-[#eaf1f8] text-[#0C2A4D] hover:bg-[#d7e6f6]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Floor selector */}
        {focus !== "all" && (
          <>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0C2A4D]/50">
              Nivel
            </p>
            <div className="mb-1 grid grid-cols-3 gap-1.5">
              {FLOORS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFloor(f)}
                  className={`rounded-lg py-1.5 text-sm font-semibold transition-colors ${
                    activeFloor === f
                      ? "bg-[#1466B8] text-white"
                      : "bg-[#eaf1f8] text-[#0C2A4D] hover:bg-[#d7e6f6]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <p className="mb-4 text-[11px] text-[#0C2A4D]/55">{FLOOR_LABELS[activeFloor].es}</p>
          </>
        )}

        {/* Go-to-gate */}
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0C2A4D]/50">
          Ir a gate
        </p>
        <select
          value={selectedGate ?? ""}
          onChange={(e) => chooseGate(e.target.value || null)}
          className="mb-4 w-full rounded-lg border border-[#cfdceb] bg-white px-2.5 py-1.5 text-sm font-medium text-[#0C2A4D] outline-none focus:border-[#1466B8]"
        >
          <option value="">Selecciona un gate…</option>
          {gateOptions.map((n) => (
            <option key={n} value={n}>
              Gate {n}
            </option>
          ))}
        </select>

        {/* Search */}
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0C2A4D]/50">
          Buscar
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Gate, servicio o aerolínea…"
          list="tocumen-search"
          className="w-full rounded-lg border border-[#cfdceb] bg-white px-2.5 py-1.5 text-sm text-[#0C2A4D] outline-none placeholder:text-[#0C2A4D]/35 focus:border-[#1466B8]"
        />
        <datalist id="tocumen-search">
          {AIRLINES.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        {query.trim() && (
          <p className="mt-1.5 text-[11px] text-[#0C2A4D]/55">
            {highlightGates.size} gate(s) · {highlightPois.size} servicio(s)
          </p>
        )}
      </div>

      {/* ── Info card ── */}
      {(selectedGateObj || selectedPoi) && (
        <div className="absolute bottom-4 left-4 w-[270px] rounded-2xl bg-white/95 p-4 shadow-xl shadow-sky-900/10 backdrop-blur-md">
          {selectedGateObj && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#1466B8]">
                {TERMINALS[selectedGateObj.terminal].name}
              </p>
              <h3 className="text-2xl font-extrabold text-[#0C2A4D]">Gate {selectedGateObj.number}</h3>
              <p className="mt-1 text-sm text-[#0C2A4D]/60">
                Embarque en {TERMINALS[selectedGateObj.terminal].name}. Dirígete al Nivel 200 (Salidas)
                tras el control de seguridad.
              </p>
            </>
          )}
          {selectedPoi && (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-sm"
                  style={{ boxShadow: `0 0 0 2px ${CATEGORY_STYLES[selectedPoi.category].color}` }}
                >
                  {CATEGORY_STYLES[selectedPoi.category].glyph}
                </span>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#1466B8]">
                  {TERMINALS[selectedPoi.terminal].name} · Nivel {selectedPoi.floor}
                </p>
              </div>
              <h3 className="mt-1 text-xl font-extrabold text-[#0C2A4D]">{selectedPoi.es}</h3>
              <p className="text-sm text-[#0C2A4D]/55">{selectedPoi.en}</p>
            </>
          )}
        </div>
      )}

      {/* ── Legend ── */}
      <div className="absolute bottom-4 right-4 rounded-2xl bg-white/85 px-4 py-3 shadow-lg shadow-sky-900/10 backdrop-blur-md">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ background: l.color }} />
              <span className="text-[11px] font-medium text-[#0C2A4D]/70">{l.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-[#0C2A4D]/40">
          Arrastra para rotar · rueda para zoom · clic en un marcador
        </p>
      </div>
    </div>
  );
}
