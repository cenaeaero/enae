"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import QRDisplay from "@/components/QRDisplay";

const STATUS_OPTIONS = [
  { value: "present", label: "Presente", color: "bg-green-100 text-green-800" },
  { value: "absent", label: "Ausente", color: "bg-red-100 text-red-800" },
  { value: "late", label: "Atrasado", color: "bg-amber-100 text-amber-800" },
  { value: "excused", label: "Justificado", color: "bg-blue-100 text-blue-800" },
];

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("es-CL", { dateStyle: "full", timeStyle: "short" });
}

// Convierte ISO (UTC) → "YYYY-MM-DDTHH:mm" en TZ local del navegador para <input type="datetime-local">
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function ClaseSincronaDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cls, setCls] = useState<any>(null);
  const [regs, setRegs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: string; notes?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [breakout, setBreakout] = useState<any>(null);
  const [applyingBreakout, setApplyingBreakout] = useState(false);
  const [breakoutMsg, setBreakoutMsg] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addSelected, setAddSelected] = useState<Set<string>>(new Set());
  const [addSearch, setAddSearch] = useState("");
  const [addCompany, setAddCompany] = useState("all");
  const [editingTime, setEditingTime] = useState(false);
  const [editStarts, setEditStarts] = useState("");
  const [editEnds, setEditEnds] = useState("");

  function openEditTime() {
    setEditStarts(toLocalInput(cls?.starts_at || cls?.scheduled_at));
    setEditEnds(toLocalInput(cls?.ends_at));
    setEditingTime(true);
  }

  async function saveTime() {
    if (!editStarts) { setMsg("Fecha de inicio requerida"); return; }
    if (editEnds && new Date(editEnds).getTime() <= new Date(editStarts).getTime()) {
      setMsg("La hora de término debe ser posterior a la de inicio"); return;
    }
    setSaving(true); setMsg("");
    const res = await fetch("/api/admin/clases-sincronas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        starts_at: new Date(editStarts).toISOString(),
        ends_at: editEnds ? new Date(editEnds).toISOString() : null,
        scheduled_at: new Date(editStarts).toISOString(),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg(data.error || "Error al guardar"); return; }
    setMsg("✓ Fecha/hora actualizada");
    setEditingTime(false);
    load();
  }

  async function load() {
    const res = await fetch(`/api/admin/clases-sincronas/${id}`).then((r) => r.json());
    setCls(res.class);
    setRegs(res.registrations || []);
    setCandidates(res.candidates || []);
    const att: Record<string, { status: string; notes?: string }> = {};
    for (const a of res.attendance || []) {
      att[a.registration_id] = { status: a.status, notes: a.notes || "" };
    }
    setAttendance(att);
    setLoading(false);
  }

  async function addStudents() {
    if (addSelected.size === 0) return;
    const res = await fetch(`/api/admin/clases-sincronas/${id}/alumnos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registration_ids: Array.from(addSelected) }),
    });
    if (res.ok) {
      setMsg(`✓ ${addSelected.size} alumno(s) agregado(s)`);
      setAddSelected(new Set());
      setShowAdd(false);
      load();
    }
  }
  useEffect(() => { load(); }, [id]);

  function setStatus(regId: string, status: string) {
    setAttendance((p) => ({ ...p, [regId]: { ...(p[regId] || {}), status } }));
  }
  function setNotes(regId: string, notes: string) {
    setAttendance((p) => ({ ...p, [regId]: { ...(p[regId] || { status: "absent" }), notes } }));
  }
  function bulkSet(status: string) {
    const next: typeof attendance = {};
    for (const r of regs) next[r.id] = { status, notes: attendance[r.id]?.notes };
    setAttendance(next);
  }

  async function saveAttendance() {
    setSaving(true); setMsg("");
    const items = regs.map((r) => ({
      registration_id: r.id,
      status: attendance[r.id]?.status || "absent",
      notes: attendance[r.id]?.notes || null,
    }));
    const res = await fetch(`/api/admin/clases-sincronas/${id}/asistencia`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setSaving(false);
    setMsg(res.ok ? "✓ Asistencia guardada" : "Error al guardar");
    if (res.ok) load();
  }

  async function removeFromClass(regId: string, name: string) {
    if (!confirm(`¿Quitar a ${name} de esta clase? No afecta su inscripción al curso.`)) return;
    await fetch(`/api/admin/clases-sincronas/${id}/alumnos?registration_id=${regId}`, { method: "DELETE" });
    load();
  }

  async function sendInvitations() {
    if (!confirm(`¿Enviar invitación por email a los ${regs.length} alumnos?`)) return;
    setSending(true); setMsg("");
    const res = await fetch(`/api/admin/clases-sincronas/${id}/invitar`, { method: "POST" });
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      setMsg(`✓ Invitaciones enviadas: ${data.sent} OK · ${data.failed} fallidas`);
      load();
    } else {
      setMsg(data.error || "Error");
    }
  }

  async function preverSalas() {
    setBreakoutMsg(""); setBreakout(null);
    const res = await fetch("/api/admin/clases-sincronas/breakout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id: id, preview: true }),
    });
    const d = await res.json();
    if (!res.ok) { setBreakoutMsg(`Error: ${d.error || "no se pudo previsualizar"}`); return; }
    setBreakout(d);
  }

  async function aplicarSalas() {
    if (!confirm("Se preasignarán las salas por empresa en la reunión de Zoom. ¿Continuar?")) return;
    setApplyingBreakout(true); setBreakoutMsg("");
    const res = await fetch("/api/admin/clases-sincronas/breakout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id: id }),
    });
    const d = await res.json();
    setApplyingBreakout(false);
    if (!res.ok) { setBreakoutMsg(`Error: ${d.error || "no se pudo aplicar"}`); return; }
    setBreakoutMsg(`✓ ${d.rooms_created} sala(s) preasignada(s) en Zoom (${d.total_online} alumnos online).`);
    setBreakout(null);
  }

  if (loading) return <p className="text-center py-16 text-gray-400">Cargando…</p>;
  if (!cls) return <p className="text-center py-16 text-red-600">No encontrada</p>;

  const presentes = Object.values(attendance).filter((a) => a.status === "present").length;
  const atrasados = Object.values(attendance).filter((a) => a.status === "late").length;
  const ausentes = Object.values(attendance).filter((a) => a.status === "absent").length;

  const sortedRegs = [...regs].sort((a, b) =>
    `${a.last_name ?? ""} ${a.first_name ?? ""}`.localeCompare(
      `${b.last_name ?? ""} ${b.first_name ?? ""}`,
      "es",
      { sensitivity: "base" },
    ),
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/admin/clases-sincronas" className="text-xs text-[#0072CE] hover:underline">← Volver a Clases</Link>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#003366]">{cls.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{cls.courses?.title} {cls.courses?.code ? `(${cls.courses.code})` : ""}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600 items-center">
              <span>📅 Inicio: {fmtDateTime(cls.starts_at || cls.scheduled_at)}</span>
              {cls.ends_at && <span>🏁 Término: {fmtDateTime(cls.ends_at)}</span>}
              {cls.instructor_email && <span>🧑‍🏫 {cls.instructor_email}</span>}
              {cls.sessions?.dates && <span>Sesión: {cls.sessions.dates}</span>}
              <button
                onClick={openEditTime}
                className="text-xs text-[#0072CE] hover:underline"
              >
                ✎ Editar fecha/hora
              </button>
            </div>
            {editingTime && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3 flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 mb-1">Inicio</label>
                  <input
                    type="datetime-local"
                    value={editStarts}
                    onChange={(e) => setEditStarts(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-gray-500 mb-1">Término</label>
                  <input
                    type="datetime-local"
                    value={editEnds}
                    onChange={(e) => setEditEnds(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  onClick={saveTime}
                  disabled={saving}
                  className="text-xs bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white font-semibold px-3 py-1.5 rounded"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button
                  onClick={() => { setEditingTime(false); setMsg(""); }}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Cancelar
                </button>
              </div>
            )}
            {cls.link_url && (
              <p className="mt-3">
                <a href={cls.link_url} target="_blank" rel="noopener noreferrer" className="text-[#0072CE] hover:underline text-sm">
                  🔗 {cls.link_url}
                </a>
              </p>
            )}
            {cls.description && (
              <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-wrap">{cls.description}</div>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button onClick={sendInvitations} disabled={sending || !cls.link_url}
              className="bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-sm font-semibold px-4 py-2 rounded"
              title={!cls.link_url ? "Agrega un link a la clase primero" : ""}>
              {sending ? "Enviando…" : cls.invitation_sent_at ? "📧 Reenviar invitación" : "📧 Enviar invitación"}
            </button>
            {cls.invitation_sent_at && (
              <p className="text-[10px] text-gray-500">Enviada: {fmtDateTime(cls.invitation_sent_at)}</p>
            )}
            <button onClick={preverSalas}
              className="bg-[#003366] hover:bg-[#00254d] text-white text-sm font-semibold px-4 py-2 rounded"
              title="Agrupa a los alumnos online por empresa y preasigna las salas en Zoom">
              🧩 Salas por empresa
            </button>
            <button onClick={() => setShowQR(true)} disabled={!cls.link_url}
              className="bg-white border border-[#0072CE] text-[#0072CE] hover:bg-blue-50 disabled:opacity-40 text-sm font-semibold px-4 py-2 rounded"
              title={!cls.link_url ? "Agrega un link a la clase primero" : "Muestra un QR para que los alumnos accedan"}>
              📱 Código QR
            </button>
          </div>
        </div>

        {/* Previsualización de salas por empresa (Zoom breakout) */}
        {breakout && (
          <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h3 className="text-sm font-semibold text-[#003366]">Salas por empresa — {breakout.rooms?.length || 0} sala(s), {breakout.total_online} alumno(s) online</h3>
              <div className="flex gap-2">
                <button onClick={() => setBreakout(null)} className="text-xs text-gray-500 hover:underline">Cerrar</button>
                <button onClick={aplicarSalas} disabled={applyingBreakout || !breakout.has_meeting}
                  className="text-xs bg-[#0072CE] hover:bg-[#005fa3] disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded"
                  title={!breakout.has_meeting ? "La clase necesita un link de Zoom con número de reunión (…/j/1234567890)" : ""}>
                  {applyingBreakout ? "Aplicando…" : "Preasignar en Zoom"}
                </button>
              </div>
            </div>
            {!breakout.has_meeting && <p className="text-xs text-amber-600 mb-2">El link de la clase no tiene un número de reunión de Zoom válido; agrégalo para poder preasignar.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(breakout.rooms || []).map((r: any) => (
                <div key={r.name} className="bg-white border border-gray-100 rounded p-2.5">
                  <p className="text-xs font-semibold text-[#003366]">🏢 {r.name} <span className="text-gray-400 font-normal">({r.count})</span></p>
                  <ul className="mt-1 text-[11px] text-gray-500 space-y-0.5">
                    {r.participants.map((e: string) => <li key={e} className="truncate">{e}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        {breakoutMsg && (
          <p className={`mt-2 text-sm ${breakoutMsg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>{breakoutMsg}</p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <Stat label="Inscritos" value={regs.length} color="text-[#003366]" />
        <Stat label="Presentes" value={presentes} color="text-green-700" />
        <Stat label="Atrasados" value={atrasados} color="text-amber-700" />
        <Stat label="Ausentes" value={ausentes} color="text-red-700" />
      </div>

      {/* Agregar alumnos a la clase */}
      {(() => {
        const alreadyIn = new Set(regs.map((r) => r.id));
        const eligible = candidates.filter((c) => !alreadyIn.has(c.id));
        // Empresas únicas presentes en los candidatos elegibles
        const companies = Array.from(
          new Set(eligible.map((c) => (c.organization || "").trim()).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b));
        const term = addSearch.trim().toLowerCase();
        const visibleEligible = eligible.filter((c) => {
          if (addCompany !== "all") {
            const org = (c.organization || "").trim();
            if (addCompany === "__none__" ? org !== "" : org !== addCompany) return false;
          }
          if (!term) return true;
          return (
            (c.first_name || "").toLowerCase().includes(term) ||
            (c.last_name || "").toLowerCase().includes(term) ||
            (c.email || "").toLowerCase().includes(term) ||
            (c.organization || "").toLowerCase().includes(term)
          );
        });
        return (
          <div className="bg-white border border-gray-200 rounded-lg mt-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">
                Agregar alumnos a esta clase
                <span className="text-xs text-gray-400 ml-2">
                  ({eligible.length} disponible{eligible.length !== 1 ? "s" : ""} del curso, no inscrito{eligible.length !== 1 ? "s" : ""} a esta clase)
                </span>
              </p>
              <button
                onClick={() => setShowAdd((v) => !v)}
                disabled={eligible.length === 0}
                className="text-xs bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-gray-300 text-white font-semibold px-3 py-1.5 rounded"
              >
                {showAdd ? "Cerrar" : "+ Agregar alumnos"}
              </button>
            </div>
            {eligible.length === 0 && candidates.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                No hay alumnos inscritos en este curso aún.{" "}
                <Link href="/admin/inscripcion" className="text-[#0072CE] hover:underline">
                  Inscribir alumnos →
                </Link>
              </p>
            )}
            {eligible.length === 0 && candidates.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Todos los alumnos del curso ya están en esta clase.
              </p>
            )}
            {showAdd && eligible.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  <input
                    type="text"
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    placeholder="Buscar por nombre, email o empresa…"
                    className="flex-1 min-w-[220px] py-2 px-3 border border-gray-300 rounded text-sm"
                  />
                  <select
                    value={addCompany}
                    onChange={(e) => setAddCompany(e.target.value)}
                    className="py-2 px-3 border border-gray-300 rounded text-sm min-w-[200px]"
                  >
                    <option value="all">Todas las empresas</option>
                    {companies.map((co) => (
                      <option key={co} value={co}>{co}</option>
                    ))}
                    <option value="__none__">— Sin empresa —</option>
                  </select>
                </div>
                <div className="border border-gray-200 rounded max-h-64 overflow-y-auto">
                  {visibleEligible.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-gray-400">Sin coincidencias.</p>
                  ) : (
                    visibleEligible.map((c) => {
                      const sessionMatches = !cls.session_id || c.session_id === cls.session_id;
                      const statusLabel =
                        c.status === "pending"
                          ? "Pendiente pago"
                          : c.status === "completed"
                          ? "Completado"
                          : "En curso";
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 last:border-0 hover:bg-blue-50 cursor-pointer ${addSelected.has(c.id) ? "bg-blue-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={addSelected.has(c.id)}
                            onChange={() =>
                              setAddSelected((p) => {
                                const n = new Set(p);
                                n.has(c.id) ? n.delete(c.id) : n.add(c.id);
                                return n;
                              })
                            }
                          />
                          <div className="flex-1 min-w-0 text-xs">
                            <p className="font-medium text-[#003366]">
                              {c.last_name}, {c.first_name}
                              {!sessionMatches && (
                                <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                  Otra sesión
                                </span>
                              )}
                              <span className="ml-2 text-[10px] text-gray-400">{statusLabel}</span>
                            </p>
                            <p className="text-gray-500">
                              {c.email} · {c.organization || "—"}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                  <div className="px-3 py-2 bg-gray-50 flex justify-between gap-2">
                    <button
                      onClick={() => {
                        const n = new Set(addSelected);
                        for (const c of visibleEligible) n.add(c.id);
                        setAddSelected(n);
                      }}
                      className="text-xs text-[#0072CE] hover:underline"
                    >
                      Seleccionar visibles
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAddSelected(new Set())}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Limpiar
                      </button>
                      <button
                        onClick={addStudents}
                        disabled={addSelected.size === 0}
                        className="text-xs bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold px-3 py-1.5 rounded"
                      >
                        Agregar {addSelected.size > 0 ? `(${addSelected.size})` : ""}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <div className="bg-white border border-gray-200 rounded-lg mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Libro de asistencia</h2>
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-xs text-gray-500 mr-1">Marcar todos:</span>
            {STATUS_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => bulkSet(o.value)}
                className={`text-xs px-2 py-1 rounded ${o.color}`}>{o.label}</button>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2">Alumno</th>
              <th className="text-left px-4 py-2">Empresa</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-left px-4 py-2">Notas</th>
              <th className="text-right px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRegs.map((r) => {
              const a = attendance[r.id] || { status: "absent" };
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2">
                    <p className="font-medium text-[#003366]">{r.last_name}, {r.first_name}</p>
                    <p className="text-[10px] text-gray-400">{r.email}</p>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">{r.organization || "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {STATUS_OPTIONS.map((o) => (
                        <button key={o.value} onClick={() => setStatus(r.id, o.value)}
                          className={`text-[10px] px-2 py-0.5 rounded ${a.status === o.value ? o.color + " font-bold ring-2 ring-offset-1" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <input type="text" value={a.notes || ""} onChange={(e) => setNotes(r.id, e.target.value)}
                      placeholder="—"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs"/>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => removeFromClass(r.id, `${r.first_name} ${r.last_name}`)}
                      className="text-xs text-red-500 hover:text-red-700" title="Quitar de esta clase">×</button>
                  </td>
                </tr>
              );
            })}
            {regs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin alumnos inscritos en este curso/sesión.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={saveAttendance} disabled={saving}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold text-sm px-5 py-2 rounded">
          {saving ? "Guardando…" : "Guardar asistencia"}
        </button>
        {msg && <span className="text-sm text-green-700">{msg}</span>}
      </div>

      {showQR && cls.link_url && (
        <QRDisplay value={cls.link_url} title={cls.title} subtitle="Escanea para acceder a la actividad" onClose={() => setShowQR(false)} />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-[10px] text-gray-400 uppercase">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
