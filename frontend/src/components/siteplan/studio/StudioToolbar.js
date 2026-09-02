import React, { useRef } from "react";
import { FileUp, ImagePlus, ImageOff, ListOrdered, MousePointer2, PenTool, Sparkles, Trash2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STUDIO } from "@/constants/testIds";

const TOOLS = [
  ["select", MousePointer2, "Pilih", "Klik bentuk untuk melihat & memetakan"],
  ["draw", PenTool, "Gambar kavling", "Klik titik sudut di atas gambar/SVG, Enter untuk menutup"],
  ["sequence", ListOrdered, "Berurutan", "Klik kavling kosong satu per satu — unit terisi berurutan"],
];

/** Toolbar Studio: sumber peta (SVG / gambar latar), alat kanvas, aksi otomatis. */
export default function StudioToolbar({ s, bgOpacity, setBgOpacity }) {
  const svgRef = useRef(null);
  const imgRef = useRef(null);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
        {TOOLS.map(([key, Icon, label, hint]) => (
          <Button key={key} size="sm" variant={s.tool === key ? "default" : "ghost"} title={hint}
            data-testid={STUDIO[`tool${key[0].toUpperCase()}${key.slice(1)}`]} aria-pressed={s.tool === key}
            onClick={() => s.setTool(key)} className="h-8">
            <Icon className="mr-1.5 h-3.5 w-3.5" /> {label}
          </Button>
        ))}
      </div>
      <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
      <input ref={svgRef} data-testid={STUDIO.uploadSvg} type="file" accept=".svg,image/svg+xml" className="hidden"
        aria-label="Unggah SVG site plan" onChange={(e) => { const f = e.target.files?.[0]; if (f) s.uploadSvg(f); e.target.value = ""; }} />
      <input ref={imgRef} data-testid={STUDIO.uploadImage} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
        aria-label="Unggah gambar latar" onChange={(e) => { const f = e.target.files?.[0]; if (f) s.uploadImage(f); e.target.value = ""; }} />
      <Button size="sm" variant="outline" disabled={!!s.busy} onClick={() => svgRef.current?.click()}>
        <FileUp className="mr-1.5 h-3.5 w-3.5" /> {s.busy === "svg" ? "Membaca SVG…" : "Unggah SVG"}
      </Button>
      <Button size="sm" variant="outline" disabled={!!s.busy} onClick={() => imgRef.current?.click()}>
        <ImagePlus className="mr-1.5 h-3.5 w-3.5" /> {s.busy === "image" ? "Mengunggah…" : "Gambar latar (PNG/JPG)"}
      </Button>
      {s.plan?.background ? (
        <div className="flex items-center gap-2 rounded-md border px-2 py-1">
          <label htmlFor="bg-opacity" className="text-[11px] text-muted-foreground">Latar</label>
          <input id="bg-opacity" data-testid={STUDIO.opacity} type="range" min={0.1} max={1} step={0.1}
            value={bgOpacity} onChange={(e) => setBgOpacity(Number(e.target.value))} className="w-20" />
          <Button size="icon" variant="ghost" className="h-6 w-6" data-testid={STUDIO.removeImage}
            aria-label="Lepas gambar latar" onClick={s.removeImage}><ImageOff className="h-3.5 w-3.5" /></Button>
        </div>
      ) : null}
      <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
      <Button size="sm" variant="outline" data-testid={STUDIO.autoMatch} disabled={!s.plan || !!s.busy} onClick={s.autoMatch}
        title="Cocokkan label kavling di peta dengan kode unit (toleran tanda pisah & nol depan)">
        <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Cocokkan otomatis
      </Button>
      {!s.plan ? (
        <Button size="sm" variant="ghost" data-testid={STUDIO.generate} disabled={!!s.busy || !s.units.length} onClick={s.generate}
          title="Peta contoh dari daftar unit — untuk mencoba fitur sebelum gambar asli ada">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Peta contoh
        </Button>
      ) : (
        <Button size="sm" variant="ghost" data-testid={STUDIO.deletePlan} disabled={!!s.busy} className="text-destructive"
          onClick={() => { if (window.confirm("Hapus seluruh peta proyek ini? Unit tidak ikut terhapus.")) s.deletePlan(); }}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus peta
        </Button>
      )}
    </div>
  );
}
