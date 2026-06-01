import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mapa 3D · Aeropuerto Internacional de Tocumen",
  description:
    "Mapa 3D interactivo del Aeropuerto Internacional de Tocumen: terminales, niveles, gates y servicios.",
};

export default function MapaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
