import api from "@/services/apiClient";
import { KIND_STYLE, SALES_COLORS } from "@/components/siteplan/planStyles";

const ORDER = { boundary: 0, green: 1, water: 2, road: 3, facility: 4, lot: 5 };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Warna kavling menurut mode: pemetaan (terpetakan/belum) atau status penjualan unit. */
export const EXTRA_STATUS = {
  handed_over: { label: "Serah Terima", fill: "#ccfbf1", stroke: "#0f766e", text: "#134e4a" },
  other: { label: "Lainnya", fill: "#fce7f3", stroke: "#be185d", text: "#831843" },
};
export const statusKey = (unit) => (!unit ? "none" : (SALES_COLORS[unit.status] || EXTRA_STATUS[unit.status]) ? unit.status : "other");

export function lotStyle(shape, unit, colorMode) {
  if (colorMode === "status") {
    if (!unit) return { fill: "#f8fafc", stroke: "#94a3b8", text: "#64748b" };
    const c = SALES_COLORS[unit.status] || EXTRA_STATUS[unit.status] || EXTRA_STATUS.other;
    return { fill: c.fill, stroke: c.stroke, text: c.text };
  }
  return unit ? { fill: "#bbf7d0", stroke: "#15803d", text: "#14532d" } : { fill: "#fff7ed", stroke: "#f59e0b", text: "#9a3412" };
}

async function backgroundDataUrl(fileId) {
  const res = await api.get(`/files/${fileId}`, { responseType: "blob" });
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(res.data);
  });
}

/** Bangun SVG mandiri (latar disematkan base64) untuk ekspor brosur. */
export async function buildExportSvg({ plan, unitsById, colorMode, title }) {
  const [vx, vy, vw, vh] = String(plan.view_box || "0 0 1600 1000").split(/[\s,]+/).map(Number);
  const parts = [`<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#ffffff"/>`];
  if (plan.background?.file_id) {
    const href = await backgroundDataUrl(plan.background.file_id);
    parts.push(`<image href="${href}" x="0" y="0" width="${plan.background.width}" height="${plan.background.height}" preserveAspectRatio="none"/>`);
  }
  const fs = Math.max(8, Math.min(vw, vh) / 60);
  [...(plan.shapes || [])].sort((a, b) => (ORDER[a.kind] ?? 9) - (ORDER[b.kind] ?? 9)).forEach((s) => {
    const isLot = s.kind === "lot";
    const u = isLot ? unitsById[s.unit_id] : null;
    const st = isLot ? lotStyle(s, u, colorMode) : (KIND_STYLE[s.kind] || KIND_STYLE.facility);
    const g = s.geom || {};
    const attrs = `fill="${st.fill}" fill-opacity="${plan.background ? 0.7 : 0.95}" stroke="${st.stroke}" stroke-width="${isLot ? 1.5 : (st.width || 1)}"${st.dash && !isLot ? ` stroke-dasharray="${st.dash}"` : ""}`;
    parts.push(g.type === "path" ? `<path d="${esc(g.d)}" ${attrs}/>` : `<polygon points="${esc(g.points)}" ${attrs}/>`);
    if (s.centroid && isLot) {
      parts.push(`<text x="${s.centroid.x}" y="${s.centroid.y + fs * 0.35}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fs}" font-weight="700" fill="${st.text || "#334155"}">${esc(u ? u.code : (s.label || ""))}</text>`);
    }
  });
  if (title) {
    parts.push(`<rect x="${vx}" y="${vy}" width="${vw}" height="${fs * 3}" fill="#0f172a" fill-opacity="0.85"/>`);
    parts.push(`<text x="${vx + fs}" y="${vy + fs * 2}" font-family="Arial, sans-serif" font-size="${fs * 1.4}" font-weight="700" fill="#fff">${esc(title)}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw}" height="${vh}">${parts.join("")}</svg>`;
}

/** SVG → PNG (lebar target px) → unduh. */
export async function downloadPng(svgText, filename, targetWidth = 2400) {
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Gagal merender SVG."));
      i.src = url;
    });
    const scale = targetWidth / (img.width || 1600);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((img.width || 1600) * scale);
    canvas.height = Math.round((img.height || 1000) * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(png);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return png;
  } finally { URL.revokeObjectURL(url); }
}
