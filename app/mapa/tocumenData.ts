// ─────────────────────────────────────────────────────────────────────────────
//  Tocumen International Airport — map data model
//
//  This file is the single source of truth for the 3D map. To add / edit a gate
//  or a point of interest you ONLY touch this file — the 3D scene reads from it.
//  Positions for POIs use normalised terminal-local coordinates (u, v):
//     u  ∈ [-1, 1]  → along the terminal length  (west ‹ ─ › east)
//     v  ∈ [-1, 1]  → across the depth           (front/airside ‹ ─ › back)
//  Gate positions are auto-distributed along the terminal's airside edge from
//  the ordered `gates` arrays, so adding a gate is just adding a number.
// ─────────────────────────────────────────────────────────────────────────────

export type TerminalId = "T1" | "T2";
export type FloorId = 100 | 200 | 300;

// ── Point-of-interest categories ───────────────────────────────────────────────
// Colours follow the official Tocumen signage palette.
export type PoiCategory =
  | "immigration"
  | "customs"
  | "baggage"
  | "security"
  | "casher"
  | "carRental"
  | "lostFound"
  | "shuttle"
  | "currency"
  | "bank"
  | "police"
  | "checkin"
  | "vip"
  | "chapel"
  | "petRelief"
  | "lactation"
  | "information"
  | "food"
  | "sensory"
  | "clinic"
  | "taxi";

export interface CategoryStyle {
  /** Hex colour of the marker. */
  color: string;
  /** Emoji glyph shown inside the marker badge. */
  glyph: string;
}

// Yellow = restricted / controlled · Blue = services · Orange = information
// Green = ground transport · Red = emergency · Teal = sensory
export const CATEGORY_STYLES: Record<PoiCategory, CategoryStyle> = {
  immigration: { color: "#F2B705", glyph: "🛂" },
  customs: { color: "#F2B705", glyph: "🛃" },
  baggage: { color: "#F2B705", glyph: "🧳" },
  security: { color: "#F2B705", glyph: "🔎" },
  casher: { color: "#F2B705", glyph: "💵" },
  carRental: { color: "#1466B8", glyph: "🚗" },
  lostFound: { color: "#1466B8", glyph: "❓" },
  shuttle: { color: "#1466B8", glyph: "🚌" },
  currency: { color: "#1466B8", glyph: "💱" },
  bank: { color: "#1466B8", glyph: "🏦" },
  police: { color: "#1466B8", glyph: "👮" },
  checkin: { color: "#1466B8", glyph: "🎫" },
  vip: { color: "#1466B8", glyph: "⭐" },
  chapel: { color: "#1466B8", glyph: "✝️" },
  petRelief: { color: "#1466B8", glyph: "🐾" },
  lactation: { color: "#1466B8", glyph: "🍼" },
  information: { color: "#EE7D22", glyph: "ℹ️" },
  food: { color: "#1466B8", glyph: "🍽️" },
  sensory: { color: "#15A0A1", glyph: "🧩" },
  clinic: { color: "#D64541", glyph: "➕" },
  taxi: { color: "#2FA84F", glyph: "🚕" },
};

// ── Terminal footprints ─────────────────────────────────────────────────────────
export interface TerminalGeometry {
  id: TerminalId;
  name: string;
  /**
   * Centre-line of the concourse on the ground plane as [x, z] control points,
   * ordered west → east. The 3D slab is an extruded ribbon that follows this
   * curve with rounded end caps, so the footprint matches the organic shape of
   * the official map instead of a rectangle.
   */
  centerline: [number, number][];
  /** Concourse width (full, across the curve). */
  width: number;
  /** Which side of the curve the gate fingers face: +1 or -1. */
  gateSide: 1 | -1;
  /** Approx [x, z] used to frame the camera (curve midpoint region). */
  center: [number, number];
  floors: FloorId[];
}

export const TERMINALS: Record<TerminalId, TerminalGeometry> = {
  T1: {
    id: "T1",
    name: "Terminal 1",
    // Curved boomerang concourse: rounded west bulb (101-115) → main body
    // (120-139) → gentle rise toward the inter-terminal corridor.
    centerline: [
      [-72, 9],
      [-58, 2],
      [-44, -2],
      [-30, -2.5],
      [-17, 0.5],
      [-9, 7],
    ],
    width: 14,
    gateSide: -1,
    center: [-40, -1],
    floors: [100, 200, 300],
  },
  T2: {
    id: "T2",
    name: "Terminal 2",
    // Mirror crescent on the east side: corridor end → body (201-220) →
    // rounded east bulb (221-225).
    centerline: [
      [9, 7],
      [18, 0.5],
      [31, -2.5],
      [45, -2],
      [59, 2],
      [71, 9],
    ],
    width: 13,
    gateSide: -1,
    center: [40, -1],
    floors: [100, 200, 300],
  },
};

// Vertical layout of the "exploded" building.
export const FLOOR_GAP = 7;
export const SLAB_THICKNESS = 1.2;

export function floorIndex(floor: FloorId): number {
  return (floor - 100) / 100;
}
export function floorBaseY(floor: FloorId): number {
  return floorIndex(floor) * FLOOR_GAP;
}

export const FLOOR_LABELS: Record<FloorId, { es: string; en: string }> = {
  100: { es: "Nivel 100 · Llegadas / Área Central", en: "Level 100 · Arrivals" },
  200: { es: "Nivel 200 · Salidas / Check-in", en: "Level 200 · Departures" },
  300: { es: "Nivel 300 · Restaurantes", en: "Level 300 · Food Court" },
};

// ── Gates ───────────────────────────────────────────────────────────────────────
// Ordered west → east as printed on the official terminal map.
export const T1_GATES: string[] = [
  "108", "107", "106", "105", "104", "103", "102", "101",
  "109", "110", "111", "112", "114", "115",
  "120", "121", "122", "123", "124", "125", "126", "127",
  "128", "129", "130", "131", "132", "133", "134", "135",
  "136", "137", "138", "139",
  "140", "141", "142", "143", "144", "145", "146", "147",
];

export const T2_GATES: string[] = [
  "201", "202", "203", "204",
  "207", "208", "209", "210", "211",
  "215", "216", "217", "218", "219", "220",
  "221", "222", "223", "224", "225",
];

export interface Gate {
  number: string;
  terminal: TerminalId;
}

export const GATES: Gate[] = [
  ...T1_GATES.map((n): Gate => ({ number: n, terminal: "T1" })),
  ...T2_GATES.map((n): Gate => ({ number: n, terminal: "T2" })),
];

export function gatesForTerminal(terminal: TerminalId): string[] {
  return terminal === "T1" ? T1_GATES : T2_GATES;
}

// ── Points of interest ────────────────────────────────────────────────────────
export interface Poi {
  id: string;
  terminal: TerminalId;
  floor: FloorId;
  category: PoiCategory;
  es: string;
  en: string;
  u: number; // along length, −1 west .. 1 east
  v: number; // across depth, −1 front/airside .. 1 back/landside
}

export const POIS: Poi[] = [
  // ── Terminal 1 · Nivel 100 (Arrivals / Área Central) ──
  { id: "t1-100-imm", terminal: "T1", floor: 100, category: "immigration", es: "Migración", en: "Immigration", u: -0.15, v: 0.45 },
  { id: "t1-100-bag", terminal: "T1", floor: 100, category: "baggage", es: "Reclamo de Equipaje", en: "Baggage Claim", u: 0.1, v: 0.1 },
  { id: "t1-100-cus", terminal: "T1", floor: 100, category: "customs", es: "Aduanas", en: "Customs", u: 0.5, v: 0.3 },
  { id: "t1-100-car", terminal: "T1", floor: 100, category: "carRental", es: "Autos de Alquiler", en: "Car Rental", u: 0.35, v: -0.25 },
  { id: "t1-100-lost", terminal: "T1", floor: 100, category: "lostFound", es: "Objetos Extraviados", en: "Lost & Found", u: 0.55, v: -0.05 },
  { id: "t1-100-taxi", terminal: "T1", floor: 100, category: "taxi", es: "Taxi Autorizado", en: "Authorized Taxi", u: -0.45, v: -0.55 },
  { id: "t1-100-shut", terminal: "T1", floor: 100, category: "shuttle", es: "Bus Interterminal", en: "Shuttle Bus", u: -0.1, v: -0.5 },
  { id: "t1-100-cur", terminal: "T1", floor: 100, category: "currency", es: "Casa de Cambio", en: "Currency Exchange", u: -0.62, v: -0.2 },
  { id: "t1-100-bank", terminal: "T1", floor: 100, category: "bank", es: "Banco", en: "Bank", u: -0.72, v: 0.15 },
  { id: "t1-100-pol", terminal: "T1", floor: 100, category: "police", es: "Policía", en: "Police", u: -0.5, v: 0.0 },
  { id: "t1-100-cash", terminal: "T1", floor: 100, category: "casher", es: "Caja", en: "Casher", u: -0.55, v: 0.35 },

  // ── Terminal 1 · Nivel 200 (Departures) ──
  { id: "t1-200-chk", terminal: "T1", floor: 200, category: "checkin", es: "Boletos / Check-in", en: "Check-in", u: -0.5, v: 0.3 },
  { id: "t1-200-sec", terminal: "T1", floor: 200, category: "security", es: "Control de Seguridad", en: "Security Check Point", u: 0.0, v: 0.0 },
  { id: "t1-200-vip1", terminal: "T1", floor: 200, category: "vip", es: "Sala VIP · The Lounge", en: "VIP Lounge", u: -0.82, v: -0.2 },
  { id: "t1-200-vip2", terminal: "T1", floor: 200, category: "vip", es: "Sala VIP · Copa Airlines", en: "Copa VIP Room", u: -0.32, v: -0.3 },
  { id: "t1-200-chp", terminal: "T1", floor: 200, category: "chapel", es: "Capilla", en: "Chapel", u: -0.42, v: -0.5 },
  { id: "t1-200-pet", terminal: "T1", floor: 200, category: "petRelief", es: "Área de Mascotas", en: "Pet Relief", u: -0.12, v: -0.42 },
  { id: "t1-200-lac", terminal: "T1", floor: 200, category: "lactation", es: "Sala de Lactancia", en: "Lactation Room", u: 0.42, v: -0.3 },
  { id: "t1-200-bag", terminal: "T1", floor: 200, category: "baggage", es: "Reclamo de Equipaje", en: "Baggage Claim", u: 0.62, v: -0.2 },
  { id: "t1-200-cus", terminal: "T1", floor: 200, category: "customs", es: "Aduanas", en: "Customs", u: -0.72, v: 0.42 },
  { id: "t1-200-sen", terminal: "T1", floor: 200, category: "sensory", es: "Sala Sensorial", en: "Sensory Room", u: 0.22, v: 0.42 },
  { id: "t1-200-cli", terminal: "T1", floor: 200, category: "clinic", es: "Clínica de Emergencias", en: "Emergency Clinic", u: 0.34, v: 0.46 },
  { id: "t1-200-inf", terminal: "T1", floor: 200, category: "information", es: "Centro de Información", en: "Information Center", u: -0.08, v: 0.22 },

  // ── Terminal 1 · Nivel 300 (Food court) ──
  { id: "t1-300-inf", terminal: "T1", floor: 300, category: "information", es: "Centro de Información", en: "Information Center", u: -0.32, v: 0.0 },
  { id: "t1-300-food1", terminal: "T1", floor: 300, category: "food", es: "Restaurantes", en: "Food Court", u: 0.1, v: -0.22 },
  { id: "t1-300-food2", terminal: "T1", floor: 300, category: "food", es: "Restaurantes", en: "Food Court", u: 0.5, v: 0.2 },

  // ── Terminal 2 · Nivel 100 ──
  { id: "t2-100-shut", terminal: "T2", floor: 100, category: "shuttle", es: "Bus Interterminal · Hacia T1", en: "Shuttle Bus to T1", u: -0.35, v: -0.45 },
  { id: "t2-100-bag", terminal: "T2", floor: 100, category: "baggage", es: "Reclamo de Equipaje", en: "Baggage Claim", u: 0.2, v: 0.2 },
  { id: "t2-100-imm", terminal: "T2", floor: 100, category: "immigration", es: "Migración", en: "Immigration", u: 0.0, v: 0.4 },

  // ── Terminal 2 · Nivel 200 ──
  { id: "t2-200-vip", terminal: "T2", floor: 200, category: "vip", es: "Sala VIP · Copa Airlines", en: "Copa VIP Room", u: -0.2, v: -0.3 },
  { id: "t2-200-inf", terminal: "T2", floor: 200, category: "information", es: "Centro de Información", en: "Information Center", u: 0.05, v: 0.2 },
  { id: "t2-200-sec", terminal: "T2", floor: 200, category: "security", es: "Control de Seguridad", en: "Security Check Point", u: -0.4, v: 0.0 },
  { id: "t2-200-chk", terminal: "T2", floor: 200, category: "checkin", es: "Boletos / Check-in", en: "Check-in", u: 0.4, v: 0.3 },

  // ── Terminal 2 · Nivel 300 (Food court) ──
  { id: "t2-300-food1", terminal: "T2", floor: 300, category: "food", es: "Restaurantes", en: "Food Court", u: -0.2, v: -0.2 },
  { id: "t2-300-food2", terminal: "T2", floor: 300, category: "food", es: "Restaurantes", en: "Food Court", u: 0.3, v: 0.1 },
];

// ── Airlines (placeholder for the upcoming search step) ──────────────────────────
// Real gate↔airline assignments are dynamic; Copa Airlines is the hub carrier and
// operates the bulk of Terminal 1 + Terminal 2. This list seeds the search UI.
export const AIRLINES: string[] = [
  "Copa Airlines",
  "American Airlines",
  "Avianca",
  "United Airlines",
  "KLM",
  "Iberia",
  "Air France",
  "Wingo",
];
