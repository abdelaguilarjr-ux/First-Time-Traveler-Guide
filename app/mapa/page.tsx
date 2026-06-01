"use client";

import dynamic from "next/dynamic";

const TocumenMap = dynamic(() => import("./TocumenMap"), { ssr: false });

export default function MapaPage() {
  return (
    <main className="h-screen w-screen">
      <TocumenMap />
    </main>
  );
}
