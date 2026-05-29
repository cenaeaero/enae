"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Cls = {
  id: string;
  course_id: string;
  session_id: string | null;
  title: string;
  kind: string;
  link_url: string | null;
  starts_at: string;
  ends_at: string | null;
  scheduled_at: string;
  duration_minutes: number;
  instructor_email: string | null;
  status: string;
  invitation_sent_at: string | null;
  courses?: { title: string; code: string | null } | null;
  sessions?: { dates: string; location: string } | null;
};

type CandidateRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  organization: string | null;
};

const KIND_LABEL: Record<string, string> = {
  class: "Clase",
  exam: "Examen",
  assignment: "Tarea",
  workshop: "Taller",
  meeting: "Reunión",
};
const KIND_COLOR: Record<string, string> = {
  class: "bg-blue-100 text-blue-700",
  exam: "bg-red-100 text-red-700",
  assignment: "bg-amber-100 text-amber-700",
  workshop: "bg-purple-100 text-purple-700",
  meeting: "bg-gray-100 text-gray-700",
};

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

export default function ClasesSincronasPage() {
  const [classes, setClasses] = useState<Cls[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  async function load() {
    const res = await fetch("/api/admin/clases-sincronas").then((r) => r.json());
    setClasses(res.classes || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const today0 = startOfToday.getTime();
    return classes.filter((c) => {
      const startMs = new Date(c.starts_at || c.scheduled_at).getTime();
      const endMs = c.ends_at ? new Date(c.ends_at).getTime() : startMs + 3600000;
      // "Próximas": clase de hoy o futura, o cuyo término aún no pasa
      if (filter === "upcoming") return startMs >= today0 || endMs > now;
      if (filter === "past") return endMs <= now && startMs < today0;
      return true;
    });
  }, [classes, filter]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Clases Sincrónicas</h1>
          <p className="text-sm text-gray-500">Clases en vivo, exámenes, tareas. Cada actividad incluye link + libro de asistencia + email a los alumnos.</p>
        </div>
        <button onClick={() => setCreating(true)} className="bg-[#0072CE] hover:bg-[#005fa3] text-white text-sm font-semibold px-4 py-2 rounded">
          + Nueva clase / actividad
        </button>
      </div>

      <div className="flex gap-1 mb-4">
        {[
          { k: "upcoming", l: "Próximas" },
          { k: "past", l: "Pasadas" },
          { k: "all", l: "Todas" },
        ].map((b) => (
          <button key={b.k} onClick={() => setFilter(b.k as any)}
            className={`text-xs px-3 py-1.5 rounded ${filter === b.k ? "bg-[#0072CE] text-white" : "bg-white border border-gray-300 text-gray-600"}`}>
            {b.l}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400">Cargando…</p> : filtered.length === 0 ? (
        <p className="text-gray-400 py-8 text-center bg-white rounded-lg border border-gray-200">Sin clases en esta vista.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Link key={c.id} href={`/admin/clases-sincronas/${c.id}`}
              className="block bg-white border border-gray-200 hover:border-[#0072CE] rounded-lg p-4 transition">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${KIND_COLOR[c.kind]}`}>
                      {KIND_LABEL[c.kind].toUpperCase()}
                    </span>
                    <p className="font-semibold text-[#003366]">{c.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {c.courses?.title || "—"} {c.courses?.code ? `(${c.courses.code})` : ""}
                    {c.sessions?.dates ? ` · ${c.sessions.dates}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-2">
                    <span>📅 {fmtDateTime(c.starts_at || c.scheduled_at)}</span>
                    {c.ends_at && <span>→ {fmtDateTime(c.ends_at)}</span>}
                    {c.instructor_email && <span>🧑‍🏫 {c.instructor_email}</span>}
                    {c.link_url && <span className="text-[#0072CE]">🔗 link configurado</span>}
                    {c.invitation_sent_at && <span className="text-green-700">✓ invitación enviada</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && <ClassForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function ClassForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [courses, setCourses] = useState<{ id: string; title: string; code: string | null }[]>([]);
  const [sessions, setSessions] = useState<{ id: string; dates: string; location: string }[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [filterCompany, setFilterCompany] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<any>({ kind: "class" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("id, title, code").eq("is_active", true).order("title");
      setCourses(data || []);
    })();
  }, []);

  useEffect(() => {
    if (!form.course_id) { setSessions([]); setCandidates([]); return; }
    (async () => {
      const { data } = await supabase.from("sessions").select("id, dates, location").eq("course_id", form.course_id).eq("is_active", true);
      setSessions(data || []);
    })();
  }, [form.course_id]);

  // Cargar alumnos elegibles (filtrados por curso + sesión opcional)
  useEffect(() => {
    if (!form.course_id) { setCandidates([]); setCompanies([]); return; }
    (async () => {
      let q = supabase
        .from("registrations")
        .select("id, first_name, last_name, email, organization, status")
        .eq("course_id", form.course_id)
        .in("status", ["confirmed", "completed"])
        .order("last_name");
      if (form.session_id) q = q.eq("session_id", form.session_id);
      const { data } = await q;
      setCandidates((data || []) as any);
      const orgs = Array.from(new Set((data || []).map((d: any) => d.organization).filter(Boolean))) as string[];
      setCompanies(orgs.sort());
    })();
  }, [form.course_id, form.session_id]);

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }
  function toggle(id: string) {
    setSelectedIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selectAllVisible() {
    setSelectedIds((p) => { const n = new Set(p); for (const c of visible) n.add(c.id); return n; });
  }
  function clearSelection() { setSelectedIds(new Set()); }

  const visible = useMemo(() => {
    if (!filterCompany) return candidates;
    return candidates.filter((c) => (c.organization || "") === filterCompany);
  }, [candidates, filterCompany]);

  async function save() {
    if (!form.starts_at) { setError("Fecha y hora de inicio requerida"); return; }
    if (form.ends_at && new Date(form.ends_at).getTime() <= new Date(form.starts_at).getTime()) {
      setError("La hora de término debe ser posterior a la de inicio"); return;
    }
    setSaving(true); setError("");
    // datetime-local viene sin TZ — interpretamos en TZ local del navegador y enviamos ISO con offset
    const payload = {
      ...form,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      registration_ids: Array.from(selectedIds),
    };
    const res = await fetch("/api/admin/clases-sincronas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Error"); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-[#003366]">Nueva clase / actividad</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select value={form.kind} onChange={(e) => set("kind", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="class">Clase sincrónica</option>
                <option value="exam">Examen en línea</option>
                <option value="assignment">Tarea / Trabajo</option>
                <option value="workshop">Taller</option>
                <option value="meeting">Reunión</option>
              </select>
            </div>
            <F label="Título *" value={form.title || ""} onChange={(v) => set("title", v)} placeholder="Ej: Clase final Operador UAS N1 - Prosegur"/>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Curso *</label>
              <select value={form.course_id || ""} onChange={(e) => set("course_id", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="">Seleccionar…</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title} {c.code ? `(${c.code})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sesión (opcional)</label>
              <select value={form.session_id || ""} onChange={(e) => set("session_id", e.target.value || null)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="">Todas las sesiones del curso</option>
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.dates} · {s.location}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <F label="Inicio *"  value={form.starts_at?.slice(0, 16) || ""} onChange={(v) => set("starts_at", v)} type="datetime-local" />
            <F label="Término *" value={form.ends_at?.slice(0, 16) || ""}   onChange={(v) => set("ends_at", v)}   type="datetime-local" />
          </div>

          <F label="Link (Zoom / Meet / Google Form / etc.)" value={form.link_url || ""} onChange={(v) => set("link_url", v)} placeholder="https://meet.google.com/abc-defg-hij" />
          <F label="Email del instructor (opcional)" value={form.instructor_email || ""} onChange={(v) => set("instructor_email", v)} type="email" />

          <div>
            <label className="block text-xs text-gray-500 mb-1">Descripción / Instrucciones</label>
            <textarea rows={3} value={form.description || ""} onChange={(e) => set("description", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>

          {/* Selección de alumnos */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[#003366]">Alumnos a inscribir en esta clase ({selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""})</h3>
              <div className="flex gap-2 items-center">
                {companies.length > 1 && (
                  <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className="text-xs border border-gray-300 rounded px-2 py-1">
                    <option value="">Todas las empresas</option>
                    {companies.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                <button type="button" onClick={selectAllVisible} className="text-xs text-[#0072CE] hover:underline">Seleccionar visibles</button>
                <button type="button" onClick={clearSelection} className="text-xs text-gray-500 hover:underline">Limpiar</button>
              </div>
            </div>
            {!form.course_id ? (
              <p className="text-xs text-gray-400 py-3">Elige un curso para ver los alumnos elegibles.</p>
            ) : visible.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">No hay alumnos elegibles con los filtros actuales.</p>
            ) : (
              <div className="border border-gray-200 rounded max-h-64 overflow-y-auto">
                {visible.map((c) => (
                  <label key={c.id} className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 last:border-0 hover:bg-blue-50 cursor-pointer ${selectedIds.has(c.id) ? "bg-blue-50" : ""}`}>
                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggle(c.id)}/>
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-medium text-[#003366]">{c.last_name}, {c.first_name}</p>
                      <p className="text-gray-500">{c.email} · {c.organization || "—"}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-2 z-10">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-sm font-semibold rounded">
            {saving ? "Creando…" : `Crear clase${selectedIds.size > 0 ? ` con ${selectedIds.size} alumno${selectedIds.size > 1 ? "s" : ""}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"/>
    </div>
  );
}
