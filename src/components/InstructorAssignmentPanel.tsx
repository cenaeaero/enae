"use client";

import { useEffect, useState } from "react";

type Assignment = {
  id: string;
  instructor_email: string;
  kind: string;
  city: string | null;
  scheduled_date: string | null;
  status: string;
  grade_theoretical: number | null;
  grade_practical: number | null;
  observations: string | null;
  evaluation_file_url: string | null;
  completed_at: string | null;
};

const KIND_LABEL: Record<string, string> = {
  theoretical: "Teórico",
  practical: "Práctico",
  both: "Teórico + Práctico",
};

const STATUS_LABEL: Record<string, string> = {
  assigned: "Asignado",
  in_progress: "En proceso",
  completed: "Completado",
  cancelled: "Cancelado",
};

type InstructorProfile = {
  email: string;
  first_name: string | null;
  last_name: string | null;
};

export default function InstructorAssignmentPanel({ registrationId }: { registrationId: string }) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [instructors, setInstructors] = useState<InstructorProfile[]>([]);
  const [instructorsLoaded, setInstructorsLoaded] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [otherEmail, setOtherEmail] = useState("");
  const [showOther, setShowOther] = useState(false);
  const [kind, setKind] = useState<"theoretical" | "practical" | "both">("practical");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/instructor-assignments?registration_id=${registrationId}`).then((r) => r.json());
    setItems(res.assignments || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [registrationId]);

  // Listado de instructores registrados (misma fuente que /admin/instructores)
  useEffect(() => {
    if (!adding || instructorsLoaded) return;
    fetch("/api/admin/perfiles")
      .then((r) => r.json())
      .then((res) => {
        const insts = (res.profiles || [])
          .filter((p: any) => p.role === "instructor" && p.email)
          .map((p: any) => ({ email: p.email, first_name: p.first_name, last_name: p.last_name }))
          .sort((a: InstructorProfile, b: InstructorProfile) =>
            `${a.first_name || ""} ${a.last_name || ""}`.localeCompare(`${b.first_name || ""} ${b.last_name || ""}`));
        setInstructors(insts);
        setInstructorsLoaded(true);
      })
      .catch(() => setInstructorsLoaded(true));
  }, [adding, instructorsLoaded]);

  function toggleEmail(email: string) {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });
  }

  async function save() {
    const emails = new Set(selectedEmails);
    if (showOther && otherEmail.trim()) emails.add(otherEmail.trim().toLowerCase());
    if (emails.size === 0) { setError("Selecciona al menos un instructor"); return; }
    setSaving(true); setError("");
    const failures: string[] = [];
    for (const em of emails) {
      const res = await fetch("/api/admin/instructor-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructor_email: em,
          registration_id: registrationId,
          kind, city: city || null, scheduled_date: date || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        failures.push(`${em}: ${data.error || "Error"}`);
      }
    }
    setSaving(false);
    if (failures.length > 0) { setError(failures.join(" · ")); load(); return; }
    setSelectedEmails(new Set()); setOtherEmail(""); setShowOther(false);
    setCity(""); setDate(""); setKind("practical");
    setAdding(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Quitar esta asignación?")) return;
    await fetch(`/api/admin/instructor-assignments?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Instructores asignados</h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs text-[#0072CE] hover:underline">+ Asignar instructor</button>
        )}
      </div>

      {adding && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

          {/* Listado de instructores registrados (selección múltiple) */}
          <p className="text-xs font-medium text-gray-600 mb-1">Instructores registrados</p>
          {!instructorsLoaded ? (
            <p className="text-xs text-gray-400 mb-2">Cargando instructores…</p>
          ) : instructors.length === 0 ? (
            <p className="text-xs text-amber-600 mb-2">
              No hay instructores registrados. Créalos en <a href="/admin/instructores" className="underline">Instructores</a> o usa "otro email".
            </p>
          ) : (
            <div className="bg-white border border-gray-200 rounded max-h-44 overflow-y-auto mb-2 divide-y divide-gray-100">
              {instructors.map((p) => {
                const name = `${p.first_name || ""} ${p.last_name || ""}`.trim();
                return (
                  <label key={p.email} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-blue-50">
                    <input type="checkbox" checked={selectedEmails.has(p.email)} onChange={() => toggleEmail(p.email)} className="rounded" />
                    <span className="text-gray-800">{name || p.email}</span>
                    {name && <span className="text-xs text-gray-400 truncate">{p.email}</span>}
                  </label>
                );
              })}
            </div>
          )}
          {!showOther ? (
            <button onClick={() => setShowOther(true)} className="text-[11px] text-[#0072CE] hover:underline mb-2">+ Otro email (no registrado)</button>
          ) : (
            <input type="email" placeholder="otro@correo.cl" value={otherEmail} onChange={(e) => setOtherEmail(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full mb-2"/>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="practical">Práctico</option>
              <option value="theoretical">Teórico</option>
              <option value="both">Teórico + Práctico</option>
            </select>
            <input type="text" placeholder="Ciudad" value={city} onChange={(e) => setCity(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"/>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"/>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={save} disabled={saving}
              className="text-xs bg-[#0072CE] hover:bg-[#005fa3] text-white px-3 py-1.5 rounded">
              {saving ? "Guardando…" : `Asignar${selectedEmails.size + (showOther && otherEmail.trim() ? 1 : 0) > 0 ? ` (${selectedEmails.size + (showOther && otherEmail.trim() ? 1 : 0)})` : ""}`}
            </button>
            <button onClick={() => setAdding(false)} className="text-xs text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded">Cancelar</button>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">
            Puedes seleccionar uno o más. Cada instructor recibe la asignación automáticamente al loguearse en <code>/instructor</code>. El tipo, ciudad y fecha aplican a todos los seleccionados.
          </p>
        </div>
      )}

      {loading ? <p className="text-sm text-gray-400">Cargando…</p> : items.length === 0 && !adding ? (
        <p className="text-sm text-gray-400">Sin instructores asignados.</p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="border border-gray-200 rounded p-3 flex flex-wrap items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#003366]">{a.instructor_email}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 mt-1">
                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{KIND_LABEL[a.kind]}</span>
                  {a.city && <span>📍 {a.city}</span>}
                  {a.scheduled_date && <span>📅 {a.scheduled_date}</span>}
                  <span className={`px-1.5 py-0.5 rounded ${
                    a.status === "completed" ? "bg-green-100 text-green-700" :
                    a.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>{STATUS_LABEL[a.status]}</span>
                </div>
                {(a.grade_theoretical != null || a.grade_practical != null) && (
                  <p className="text-xs text-gray-600 mt-1">
                    {a.grade_theoretical != null && <span>Teo: <strong>{a.grade_theoretical}%</strong> </span>}
                    {a.grade_practical != null && <span>Prá: <strong>{a.grade_practical}%</strong></span>}
                  </p>
                )}
                {a.observations && <p className="text-xs text-gray-500 mt-1 italic">"{a.observations}"</p>}
                {a.evaluation_file_url && <p className="text-xs text-green-600 mt-1">✓ Hoja de evaluación subida</p>}
              </div>
              <button onClick={() => remove(a.id)} className="text-xs text-red-500 hover:underline shrink-0">eliminar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
