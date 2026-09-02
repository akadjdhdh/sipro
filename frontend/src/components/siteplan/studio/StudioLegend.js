import React from "react";
import { SALES_COLORS, SALES_ORDER } from "@/components/siteplan/planStyles";
import { EXTRA_STATUS, statusKey } from "@/components/siteplan/studio/exportPng";
import { STUDIO } from "@/constants/testIds";

const STATUS_TEXT = { available: "Tersedia", reserved: "Reservasi", booked: "Booking", ppjb: "PPJB", akad: "Akad", sold: "Terjual" };

/** Legenda kanvas — mode pemetaan atau status penjualan, dengan hitungan per kategori. */
export default function StudioLegend({ colorMode, shapes, unitsById }) {
  const lots = shapes.filter((s) => s.kind === "lot");
  const items = colorMode === "status"
    ? [...SALES_ORDER.map((k) => ({ key: k, label: STATUS_TEXT[k] || k, fill: SALES_COLORS[k].fill, stroke: SALES_COLORS[k].stroke,
      n: lots.filter((s) => statusKey(unitsById[s.unit_id]) === k).length })),
    ...Object.entries(EXTRA_STATUS).map(([k, c]) => ({ key: k, label: c.label, fill: c.fill, stroke: c.stroke,
      n: lots.filter((s) => statusKey(unitsById[s.unit_id]) === k).length })),
    { key: "none", label: "Tanpa unit", fill: "#f8fafc", stroke: "#94a3b8", n: lots.filter((s) => !unitsById[s.unit_id]).length }]
      .filter((it) => it.n > 0 || !["other", "handed_over"].includes(it.key))
    : [{ key: "mapped", label: "Terpetakan", fill: "#bbf7d0", stroke: "#15803d", n: lots.filter((s) => unitsById[s.unit_id]).length },
      { key: "unmapped", label: "Belum terpetakan", fill: "#fff7ed", stroke: "#f59e0b", n: lots.filter((s) => !unitsById[s.unit_id]).length }];
  return (
    <div data-testid={STUDIO.legend} className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] shadow backdrop-blur">
      {items.map((it) => (
        <span key={it.key} data-testid={`${STUDIO.legendItem}-${it.key}`} className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm border" style={{ background: it.fill, borderColor: it.stroke }} />
          {it.label} <strong>{it.n}</strong>
        </span>
      ))}
    </div>
  );
}
