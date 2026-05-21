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

export default function InstructorAssignmentPanel({ registrationId }: { registrationId: string }) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
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

  async function save() {
    if (!email.trim()) { setError("Email es requerido"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/admin/instructor-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instructor_email: email.trim().toLowerCase(),
        registration_id: registrationId,
        kind, city: city || null, scheduled_date: date || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Error"); return; }
    setEmail(""); setCity(""); setDate(""); setKind("practical");
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input type="email" placeholder="Email instructor *" value={email} onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"/>
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
              {saving ? "Guardando…" : "Asignar"}
            </button>
            <button onClick={() => setAdding(false)} className="text-xs text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded">Cancelar</button>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">
            El instructor recibe la asignación automáticamente al loguearse en <code>/instructor</code>. Asegúrate que tenga rol "instructor" en su perfil.
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
