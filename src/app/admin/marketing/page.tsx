"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Metrics = { total: number; sent: number; opened: number; clicked: number; converted: number; open_rate: number; click_rate: number; conv_rate: number };
type Campaign = { id: string; subject: string; status: string; created_at: string; sent_at: string | null; total_recipients: number; courses?: { title: string } | null; metrics: Metrics };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }) : "—");

export default function MarketingPage() {
  const [tab, setTab] = useState<"campanas" | "nueva">("campanas");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);

  async function loadList() {
    setLoading(true);
    const res = await fetch("/api/admin/marketing").then((r) => r.json());
    setCampaigns(res.campaigns || []);
    setLoading(false);
  }
  useEffect(() => {
    loadList();
    supabase.from("courses").select("id, title").eq("is_active", true).order("title").then(({ data }) => setCourses(data || []));
  }, []);

  async function openDetail(id: string) {
    const res = await fetch(`/api/admin/marketing?id=${id}`).then((r) => r.json());
    setDetail(res);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">📣 Marketing</h1>
          <p className="text-sm text-gray-500">Campañas de correo para promocionar cursos, con métricas de apertura, clics y conversión.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab("campanas")} className={`text-sm px-4 py-2 rounded-lg font-medium ${tab === "campanas" ? "bg-[#0072CE] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>Campañas</button>
          <button onClick={() => setTab("nueva")} className={`text-sm px-4 py-2 rounded-lg font-medium ${tab === "nueva" ? "bg-[#0072CE] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>+ Nueva campaña</button>
        </div>
      </div>

      {tab === "nueva" ? (
        <NuevaCampana courses={courses} onSent={() => { setTab("campanas"); loadList(); }} />
      ) : loading ? (
        <p className="text-gray-400 text-sm">Cargando…</p>
      ) : campaigns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">Aún no hay campañas. Crea la primera con "+ Nueva campaña".</div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[#003366]">{c.subject}
                    {c.status === "sending" && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded align-middle">Enviando · {c.metrics.total - c.metrics.sent} pendientes</span>}
                  </p>
                  <p className="text-xs text-gray-400">{c.courses?.title ? `Promociona: ${c.courses.title} · ` : ""}Inicio {fmt(c.sent_at)} · {c.total_recipients} destinatarios</p>
                </div>
                <button onClick={() => openDetail(c.id)} className="text-xs text-[#0072CE] hover:underline">Ver detalle →</button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                <Mini label="Enviados" value={c.metrics.sent} />
                <Mini label="Aperturas" value={c.metrics.opened} sub={`${c.metrics.open_rate}%`} color="text-blue-600" />
                <Mini label="Clics" value={c.metrics.clicked} sub={`${c.metrics.click_rate}%`} color="text-purple-600" />
                <Mini label="Conversión" value={c.metrics.converted} sub={`${c.metrics.conv_rate}%`} color="text-green-600" />
                <Mini label="Sin abrir" value={c.metrics.sent - c.metrics.opened} color="text-gray-400" />
                <Mini label="Total" value={c.metrics.total} />
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && <DetailModal detail={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function Mini({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded p-2 text-center">
      <p className={`text-lg font-bold ${color || "text-[#003366]"}`}>{value}{sub && <span className="text-xs font-normal text-gray-400"> · {sub}</span>}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}

function NuevaCampana({ courses, onSent }: { courses: { id: string; title: string }[]; onSent: () => void }) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p>Hola,</p>\n<p>Te invitamos a nuestro próximo curso…</p>\n<p><a href=\"https://www.enae.cl/cursos\">Ver cursos e inscribirme</a></p>\n<p>Saludos,<br/>Escuela de Navegación Aérea</p>");
  const [promoted, setPromoted] = useState("");
  const [dailyBatch, setDailyBatch] = useState(100);
  const [aud, setAud] = useState({ alumnos: true, leads: false, custom: false });
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("");
  const [customEmails, setCustomEmails] = useState("");
  const [csvList, setCsvList] = useState<{ email: string; name: string }[]>([]);
  const [csvMsg, setCsvMsg] = useState("");
  const [count, setCount] = useState<number | null>(null);

  // Parsea un CSV: detecta la celda con email en cada fila y usa otra celda como
  // nombre. Ignora una fila de encabezado si la trae ("email"/"correo").
  function parseCsv(text: string): { email: string; name: string }[] {
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    const out: { email: string; name: string }[] = [];
    const seen = new Set<string>();
    for (const raw of text.split(/\r?\n/)) {
      if (!raw.trim()) continue;
      const cells = raw.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
      const email = cells.find((c) => emailRe.test(c.toLowerCase()));
      if (!email) continue; // fila de encabezado o sin email
      const e = email.toLowerCase();
      if (seen.has(e)) continue;
      seen.add(e);
      const name = cells.filter((c) => c && c.toLowerCase() !== e && !emailRe.test(c)).join(" ").trim();
      out.push({ email: e, name });
    }
    return out;
  }

  function downloadPlantilla() {
    const rows = [
      ["nombre", "email"],
      ["Juan Pérez", "juan.perez@ejemplo.cl"],
      ["María González", "maria.gonzalez@ejemplo.cl"],
      ["", "contacto@empresa.cl"],
    ];
    const csv = "﻿" + rows.map((r) => r.map((c) => (/[;,"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plantilla_destinatarios_ENAE.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function onCsv(file: File) {
    const text = await file.text();
    const list = parseCsv(text);
    setCsvList(list);
    setCsvMsg(list.length > 0 ? `✓ ${list.length} correos válidos en el CSV.` : "No se encontraron correos válidos en el archivo.");
    if (list.length > 0 && !aud.custom) setAud((a) => ({ ...a, custom: true }));
  }
  const [sample, setSample] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const audiencePayload = useMemo(() => ({
    alumnos: aud.alumnos, leads: aud.leads, custom: aud.custom,
    course_id: courseFilter || undefined, status: statusFilter, organization: orgFilter || undefined,
  }), [aud, courseFilter, statusFilter, orgFilter]);

  async function previewAudience() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/marketing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "audience", audience: audiencePayload, custom_emails: customEmails, custom_list: csvList }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(`Error: ${d.error}`); return; }
    setCount(d.count); setSample(d.sample || []);
  }

  async function enviar() {
    if (!subject.trim() || !bodyHtml.trim()) { setMsg("Error: asunto y contenido requeridos"); return; }
    if (!confirm(`Se enviará la campaña a ${count ?? "?"} destinatarios. ¿Continuar?`)) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/marketing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", subject, body_html: bodyHtml, promoted_course_id: promoted || null, audience: audiencePayload, custom_emails: customEmails, custom_list: csvList, daily_batch: dailyBatch }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(`Error: ${d.error}`); return; }
    alert(d.remaining > 0
      ? `✓ Primer lote enviado hoy: ${d.sent} correos. Quedan ${d.remaining} pendientes que se enviarán automáticamente en lotes de ${d.daily_batch}/día.`
      : `✓ Campaña enviada completa: ${d.sent} OK · ${d.failed} fallidos (${d.total} total).`);
    onSent();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#003366]">1. Contenido</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Asunto *</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="Nuevo curso: Metodología SORA 2.5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Curso que promociona (para medir conversión)</label>
            <select value={promoted} onChange={(e) => setPromoted(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-white">
              <option value="">— Ninguno —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Correos por día (evita saturar la mensajería)</label>
            <input type="number" min={1} max={500} value={dailyBatch} onChange={(e) => setDailyBatch(e.target.value ? parseInt(e.target.value) : 100)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
            <p className="text-[11px] text-gray-400 mt-0.5">Se envía este lote hoy y el resto automáticamente cada día.</p>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Contenido (HTML) — los links con https se rastrean automáticamente</label>
          <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} rows={8} className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono" />
        </div>
        <details className="text-xs">
          <summary className="cursor-pointer text-[#0072CE]">Ver previsualización</summary>
          <div className="border border-gray-200 rounded p-3 mt-2 bg-white" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </details>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#003366]">2. Audiencia</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={aud.alumnos} onChange={(e) => setAud({ ...aud, alumnos: e.target.checked })} /> Alumnos y ex-alumnos</label>
        {aud.alumnos && (
          <div className="ml-6 grid grid-cols-1 md:grid-cols-3 gap-2">
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white">
              <option value="">Todos los cursos</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white">
              <option value="all">Cualquier estado</option>
              <option value="confirmed">En curso</option>
              <option value="completed">Completados</option>
              <option value="pending">Pendientes</option>
            </select>
            <input value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} placeholder="Empresa (opcional)" className="border border-gray-200 rounded px-2 py-1.5 text-sm" />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={aud.leads} onChange={(e) => setAud({ ...aud, leads: e.target.checked })} /> Interesados (formulario de contacto)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={aud.custom} onChange={(e) => setAud({ ...aud, custom: e.target.checked })} /> Lista propia (CSV o pegar correos)</label>
        {aud.custom && (
          <div className="ml-6 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={downloadPlantilla} className="text-sm bg-white border border-[#0072CE] text-[#0072CE] hover:bg-blue-50 font-medium px-3 py-1.5 rounded">
                ⬇️ Descargar plantilla CSV
              </button>
              <label className="text-sm bg-[#003366] hover:bg-[#00254d] text-white font-medium px-3 py-1.5 rounded cursor-pointer">
                📄 Subir CSV
                <input type="file" accept=".csv,text/csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onCsv(f); e.target.value = ""; }} />
              </label>
              {csvMsg && <span className="text-xs text-gray-600">{csvMsg}</span>}
              {csvList.length > 0 && <button type="button" onClick={() => { setCsvList([]); setCsvMsg(""); }} className="text-xs text-gray-400 hover:underline">Quitar CSV</button>}
            </div>
            <p className="text-[11px] text-gray-400">El CSV puede tener una columna de correo (con o sin encabezado); si trae nombre en otra columna, se usa para personalizar. También puedes pegar correos abajo.</p>
            <textarea value={customEmails} onChange={(e) => setCustomEmails(e.target.value)} rows={3} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="correo1@ejemplo.cl, correo2@ejemplo.cl…" />
          </div>
        )}
        <div className="flex items-center gap-3">
          <button onClick={previewAudience} disabled={busy} className="text-sm bg-[#003366] hover:bg-[#00254d] text-white font-medium px-4 py-2 rounded disabled:opacity-50">Calcular audiencia</button>
          {count != null && <span className="text-sm text-gray-700"><strong>{count}</strong> destinatarios{sample.length > 0 ? ` — ej: ${sample.slice(0, 3).map((s) => s.email).join(", ")}…` : ""}</span>}
        </div>
      </div>

      {msg && <p className={`text-sm ${msg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>{msg}</p>}

      <div className="flex justify-end">
        <button onClick={enviar} disabled={busy || !count} className="bg-[#0072CE] hover:bg-[#005fa3] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded">
          {busy ? "Procesando…" : `📤 Enviar campaña${count ? ` (${count})` : ""}`}
        </button>
      </div>
      <p className="text-[11px] text-gray-400">Envío por SMTP propio (escuela@enae.cl). Límite 500 por campaña; Gmail permite ~500 correos/día. Para volúmenes mayores conviene un servicio de email marketing.</p>
    </div>
  );
}

function DetailModal({ detail, onClose }: { detail: any; onClose: () => void }) {
  const m = detail.metrics;
  const c = detail.campaign;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#003366]">{c.subject}</h3>
            <p className="text-xs text-gray-400">{c.courses?.title ? `Promociona: ${c.courses.title} · ` : ""}Enviada {fmt(c.sent_at)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <div className="p-5 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            <Mini label="Enviados" value={m.sent} />
            <Mini label="Aperturas" value={m.opened} sub={`${m.open_rate}%`} color="text-blue-600" />
            <Mini label="Clics" value={m.clicked} sub={`${m.click_rate}%`} color="text-purple-600" />
            <Mini label="Conversión" value={m.converted} sub={`${m.conv_rate}%`} color="text-green-600" />
            <Mini label="Errores" value={detail.recipients.filter((r: any) => r.error).length} color="text-red-500" />
          </div>
          <div className="overflow-x-auto border border-gray-100 rounded">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="px-3 py-2">Destinatario</th>
                  <th className="px-3 py-2">Enviado</th>
                  <th className="px-3 py-2">Abierto</th>
                  <th className="px-3 py-2">Clic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {detail.recipients.map((r: any) => (
                  <tr key={r.email} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5">{r.name || r.email}<span className="block text-[10px] text-gray-400">{r.email}</span>{r.error && <span className="block text-[10px] text-red-500">✗ {r.error}</span>}</td>
                    <td className="px-3 py-1.5">{r.sent_at ? "✓" : "—"}</td>
                    <td className="px-3 py-1.5">{r.opened_at ? `✓ (${r.open_count})` : "—"}</td>
                    <td className="px-3 py-1.5">{r.clicked_at ? `✓ (${r.click_count})` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
