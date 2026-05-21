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
  scheduled_at: string;
  duration_minutes: number;
  instructor_email: string | null;
  status: string;
  invitation_sent_at: string | null;
  courses?: { title: string; code: string | null } | null;
  sessions?: { dates: string; location: string } | null;
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
    return classes.filter((c) => {
      const t = new Date(c.scheduled_at).getTime();
      if (filter === "upcoming") return t > now - 3600000;
      if (filter === "past") return t <= now - 3600000;
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
                    <span>📅 {fmtDateTime(c.scheduled_at)}</span>
                    <span>⏱ {c.duration_minutes} min</span>
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
  const [form, setForm] = useState<any>({ kind: "class", duration_minutes: 60 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("courses").select("id, title, code").eq("is_active", true).order("title");
      setCourses(data || []);
    })();
  }, []);

  useEffect(() => {
    if (!form.course_id) { setSessions([]); return; }
    (async () => {
      const { data } = await supabase.from("sessions").select("id, dates, location").eq("course_id", form.course_id).eq("is_active", true);
      setSessions(data || []);
    })();
  }, [form.course_id]);

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true); setError("");
    const res = await fetch("/api/admin/clases-sincronas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Error"); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#003366]">Nueva clase / actividad</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}

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

          <F label="Título *" value={form.title || ""} onChange={(v) => set("title", v)} />

          <div className="grid grid-cols-2 gap-3">
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
                <option value="">Todos los alumnos del curso</option>
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.dates} · {s.location}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Fecha y hora *" value={form.scheduled_at?.slice(0, 16) || ""} onChange={(v) => set("scheduled_at", v)} type="datetime-local" />
            <F label="Duración (min)" value={form.duration_minutes?.toString() || "60"} onChange={(v) => set("duration_minutes", v ? Number(v) : 60)} type="number" />
          </div>

          <F label="Link (Zoom / Meet / Google Form / etc.)" value={form.link_url || ""} onChange={(v) => set("link_url", v)} placeholder="https://meet.google.com/abc-defg-hij" />

          <F label="Email del instructor (opcional)" value={form.instructor_email || ""} onChange={(v) => set("instructor_email", v)} type="email" />

          <div>
            <label className="block text-xs text-gray-500 mb-1">Descripción / Instrucciones</label>
            <textarea rows={3} value={form.description || ""} onChange={(e) => set("description", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-sm font-semibold rounded">
            {saving ? "Creando…" : "Crear clase"}
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
