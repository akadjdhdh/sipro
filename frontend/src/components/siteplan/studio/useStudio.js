import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/services/apiClient";

/** State & aksi Studio Site Plan — satu sumber untuk kanvas, toolbar, dan panel sisi. */
export default function useStudio(projectId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [tool, setTool] = useState("select"); // select | draw | sequence
  const [selectedId, setSelectedId] = useState(null);
  const [seqQueue, setSeqQueue] = useState([]);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true); setError("");
    try {
      const res = await api.get(`/site-plan-studio/${projectId}`);
      setData(res.data.data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Gagal memuat studio.");
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const run = useCallback(async (label, fn, okMsg) => {
    setBusy(label);
    try {
      const out = await fn();
      if (okMsg) toast.success(typeof okMsg === "function" ? okMsg(out) : okMsg);
      await load();
      return out;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Aksi gagal diproses.");
      return null;
    } finally { setBusy(""); }
  }, [load]);

  const plan = data?.plan || null;
  const shapes = useMemo(() => plan?.shapes || [], [plan]);
  const units = useMemo(() => data?.units || [], [data]);
  const unitsById = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u])), [units]);
  const mappedIds = useMemo(() => new Set(shapes.map((s) => s.unit_id).filter(Boolean)), [shapes]);
  const unmappedUnits = useMemo(() => units.filter((u) => !mappedIds.has(u.id))
    .sort((a, b) => String(a.code).localeCompare(String(b.code), "id", { numeric: true })),
  [units, mappedIds]);
  const unmappedLots = useMemo(() => shapes.filter((s) => s.kind === "lot" && !s.unit_id), [shapes]);
  const selected = shapes.find((s) => s.shape_id === selectedId) || null;

  const uploadSvg = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(run("svg", async () => (await api.post(
      `/site-plan-studio/${projectId}/svg`, { svg: String(reader.result || ""), filename: file.name },
    )).data.data, (d) => `SVG terbaca: ${d.detected.shapes} bentuk, ${d.detected.lots} kavling, ${d.detected.labeled} berlabel, ${d.auto_matched} cocok otomatis.`));
    reader.readAsText(file);
  });

  const uploadImage = (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return run("image", async () => (await api.post(`/site-plan-studio/${projectId}/background`, fd,
      { headers: { "Content-Type": "multipart/form-data" } })).data.data,
    "Gambar latar dipasang — gambar poligon kavling di atasnya.");
  };

  const removeImage = () => run("image", () => api.delete(`/site-plan-studio/${projectId}/background`), "Gambar latar dilepas.");
  const autoMatch = () => run("match", async () => (await api.post(`/site-plan-studio/${projectId}/auto-match`)).data.data,
    (d) => `${d.matched} kavling tercocokkan otomatis · cakupan ${d.stats.coverage_pct}%.`);
  const generate = () => run("generate", () => api.post(`/site-plan/${projectId}/generate`), "Peta contoh dibangkitkan dari daftar unit.");
  const deletePlan = () => run("delete", () => api.delete(`/site-plan/${projectId}/plan`), "Peta dihapus.");

  const addShape = (points, kind = "lot") => run("shape", async () => {
    const res = await api.post(`/site-plan-studio/${projectId}/shapes`, { items: [{ points, kind }] });
    const added = res.data.data.added?.[0];
    if (added) setSelectedId(added.shape_id);
    return added;
  }, "Bentuk ditambahkan.");

  const patchShape = (sid, patch) => run("shape", () => api.put(`/site-plan-studio/${projectId}/shapes/${sid}`, patch), "Bentuk diperbarui.");
  const deleteShape = (sid) => run("shape", async () => { await api.delete(`/site-plan-studio/${projectId}/shapes/${sid}`); setSelectedId(null); }, "Bentuk dihapus.");

  const assignUnit = (sid, unitId) => run("map", () => api.put(`/site-plan/${projectId}/mapping`,
    { items: [{ shape_id: sid, unit_id: unitId || "" }] }), unitId ? "Kavling dipetakan ke unit." : "Pemetaan dilepas.");

  /** Mode berurutan: klik kavling kosong → unit teratas antrean dipetakan. */
  const clickShape = async (shape) => {
    if (tool === "sequence" && shape.kind === "lot" && !shape.unit_id) {
      const next = seqQueue[0] || unmappedUnits[0];
      if (!next) { toast.info("Semua unit sudah terpetakan."); return; }
      setSelectedId(shape.shape_id);
      await assignUnit(shape.shape_id, next.id);
      setSeqQueue((q) => q.filter((u) => u.id !== next.id));
      return;
    }
    setSelectedId(shape.shape_id);
  };

  return {
    data, plan, shapes, units, unitsById, unmappedUnits, unmappedLots, selected, selectedId,
    loading, error, busy, tool, setTool, seqQueue, setSeqQueue, setSelectedId, load,
    uploadSvg, uploadImage, removeImage, autoMatch, generate, deletePlan, addShape,
    patchShape, deleteShape, assignUnit, clickShape, projectId,
  };
}
