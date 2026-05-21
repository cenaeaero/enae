"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "present", label: "Presente", color: "bg-green-100 text-green-800" },
  { value: "absent", label: "Ausente", color: "bg-red-100 text-red-800" },
  { value: "late", label: "Atrasado", color: "bg-amber-100 text-amber-800" },
  { value: "excused", label: "Justificado", color: "bg-blue-100 text-blue-800" },
];

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("es-CL", { dateStyle: "full", timeStyle: "short" });
}

export default function ClaseSincronaDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cls, setCls] = useState<any>(null);
  const [regs, setRegs] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: string; notes?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/clases-sincronas/${id}`).then((r) => r.json());
    setCls(res.class);
    setRegs(res.registrations || []);
    const att: Record<string, { status: string; notes?: string }> = {};
    for (const a of res.attendance || []) {
      att[a.registration_id] = { status: a.status, notes: a.notes || "" };
    }
    setAttendance(att);
    setLoading(false);
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

  if (loading) return <p className="text-center py-16 text-gray-400">Cargando…</p>;
  if (!cls) return <p className="text-center py-16 text-red-600">No encontrada</p>;

  const presentes = Object.values(attendance).filter((a) => a.status === "present").length;
  const atrasados = Object.values(attendance).filter((a) => a.status === "late").length;
  const ausentes = Object.values(attendance).filter((a) => a.status === "absent").length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/admin/clases-sincronas" className="text-xs text-[#0072CE] hover:underline">← Volver a Clases</Link>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#003366]">{cls.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{cls.courses?.title} {cls.courses?.code ? `(${cls.courses.code})` : ""}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              <span>📅 Inicio: {fmtDateTime(cls.starts_at || cls.scheduled_at)}</span>
              {cls.ends_at && <span>🏁 Término: {fmtDateTime(cls.ends_at)}</span>}
              {cls.instructor_email && <span>🧑‍🏫 {cls.instructor_email}</span>}
              {cls.sessions?.dates && <span>Sesión: {cls.sessions.dates}</span>}
            </div>
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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <Stat label="Inscritos" value={regs.length} color="text-[#003366]" />
        <Stat label="Presentes" value={presentes} color="text-green-700" />
        <Stat label="Atrasados" value={atrasados} color="text-amber-700" />
        <Stat label="Ausentes" value={ausentes} color="text-red-700" />
      </div>

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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {regs.map((r) => {
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
                </tr>
              );
            })}
            {regs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin alumnos inscritos en este curso/sesión.</td></tr>
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
