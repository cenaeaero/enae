"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  type PracticeSite, type PracticeAuthorization, SITE_TYPE_LABELS,
  authorizationState, mapsUrlFor,
} from "@/lib/practice-sites";

type SiteRow = PracticeSite & { uses: number };
type Course = { id: string; title: string; code: string | null };

const EMPTY: Partial<PracticeSite> = {
  name: "", code: "", site_type: "zona_vuelo", status: "activo", operation_types: ["VLOS"], course_ids: [],
};
const AUTHORITIES = ["DGAC", "FACh", "Propietario", "ATC", "Municipalidad", "Otro"];

const authBadge: Record<string, string> = {
  vigente: "bg-green-100 text-green-800",
  por_vencer: "bg-orange-100 text-orange-800",
  vencida: "bg-red-100 text-red-700",
  sin_autorizaciones: "bg-gray-100 text-gray-600",
};
const authLabel: Record<string, string> = {
  vigente: "Vigente", por_vencer: "Por vencer", vencida: "Vencida", sin_autorizaciones: "Sin autorizaciones",
};

export default function LugaresPracticaPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<Partial<PracticeSite> | null>(null);
  const [auths, setAuths] = useState<PracticeAuthorization[]>([]);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [showSuspended, setShowSuspended] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/lugares-practica");
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setError(d.error || "Error al cargar");
    else setSites(d.sites || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    supabase.from("courses").select("id, title, code").eq("is_active", true).order("title")
      .then(({ data }) => setCourses((data as Course[]) || []));
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return sites.filter((s) => (showSuspended || s.status === "activo") &&
      (!t || [s.name, s.code, s.city, s.region, s.comuna].some((v) => (v || "").toLowerCase().includes(t))));
  }, [sites, q, showSuspended]);

  function openNew() { setEditing({ ...EMPTY }); setAuths([]); setMsg(""); }
  function openEdit(s: SiteRow) {
    setEditing({ ...s });
    setAuths((s.practice_site_authorizations || []).map((a) => ({ ...a })));
    setMsg("");
  }

  function set<K extends keyof PracticeSite>(k: K, v: any) { setEditing((e) => ({ ...(e || {}), [k]: v })); }

  async function save() {
    if (!editing?.name?.trim()) { setMsg("Error: el nombre es requerido"); return; }
    setSaving(true);
    const { practice_site_authorizations, ...site } = editing as any;
    delete site.uses; delete site.id; delete site.created_at; delete site.updated_at;
    const res = await fetch("/api/admin/lugares-practica", {
      method: editing.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, site, authorizations: auths }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setMsg(`Error: ${d.error || "no se pudo guardar"}`); return; }
    setEditing(null);
    setMsg("✓ Lugar guardado");
    load();
  }

  async function remove(s: SiteRow) {
    if (!confirm(`¿Eliminar "${s.name}"? Si tiene clases asociadas, conviene suspenderlo.`)) return;
    const res = await fetch(`/api/admin/lugares-practica?id=${s.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "✓ Lugar eliminado" : `Error: ${d.error}`);
    load();
  }

  if (editing) return (
    <SiteForm
      site={editing} auths={auths} courses={courses} saving={saving} msg={msg}
      set={set} setAuths={setAuths} onCancel={() => setEditing(null)} onSave={save}
    />
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Lugares de práctica</h1>
          <p className="text-sm text-gray-500">Catálogo que usan instructores y administración al programar las clases prácticas.</p>
        </div>
        <button onClick={openNew} className="bg-[#0072CE] hover:bg-[#005fa3] text-white text-sm font-semibold px-4 py-2 rounded">+ Nuevo lugar</button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, código, ciudad o región…"
          className="border border-gray-200 rounded px-3 py-2 text-sm w-80" />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showSuspended} onChange={(e) => setShowSuspended(e.target.checked)} className="rounded" />
          Ver suspendidos
        </label>
        {msg && <span className={`text-xs ${msg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>{msg}</span>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700 mb-4">
          {error}
          {/relation|does not exist|schema cache/i.test(error) && (
            <p className="mt-1 text-xs">Falta ejecutar <code>supabase/migration_lugares_practica.sql</code> en Supabase.</p>
          )}
        </div>
      )}

      {loading ? <p className="text-gray-400 text-sm">Cargando…</p> : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">Sin lugares registrados.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Lugar</th>
                <th className="text-left px-4 py-2">Ubicación</th>
                <th className="text-left px-4 py-2">Límites</th>
                <th className="text-left px-4 py-2">Autorizaciones</th>
                <th className="text-right px-4 py-2">Clases</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => {
                const st = authorizationState(s);
                const maps = mapsUrlFor(s);
                return (
                  <tr key={s.id} className={s.status === "suspendido" ? "opacity-60" : ""}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#003366]">{s.name}</p>
                      <p className="text-xs text-gray-500">{[s.code, SITE_TYPE_LABELS[s.site_type]].filter(Boolean).join(" · ")}
                        {s.status === "suspendido" && <span className="ml-2 text-red-600 font-medium">Suspendido</span>}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {[s.comuna, s.city, s.region].filter(Boolean).join(", ") || "—"}
                      {maps && <a href={maps} target="_blank" rel="noopener noreferrer" className="block text-[#0072CE] hover:underline">📍 Mapa</a>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {[s.max_height_agl_m != null ? `${s.max_height_agl_m} m AGL` : null,
                        s.max_radius_m != null ? `radio ${s.max_radius_m} m` : null,
                        (s.operation_types || []).join("/") || null,
                        s.restricted_zones ? `Zona: ${s.restricted_zones}` : null].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${authBadge[st.state]}`} title={st.detail}>{authLabel[st.state]}</span>
                      {st.state !== "vigente" && st.state !== "sin_autorizaciones" && <p className="text-[11px] text-gray-500 mt-0.5">{st.detail}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">{s.uses}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(s)} className="text-xs text-[#0072CE] hover:underline mr-3">Editar</button>
                      <button onClick={() => remove(s)} className="text-xs text-red-600 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SiteForm({ site, auths, courses, saving, msg, set, setAuths, onCancel, onSave }: {
  site: Partial<PracticeSite>; auths: PracticeAuthorization[]; courses: Course[]; saving: boolean; msg: string;
  set: (k: keyof PracticeSite, v: any) => void; setAuths: (a: PracticeAuthorization[]) => void;
  onCancel: () => void; onSave: () => void;
}) {
  const T = (k: keyof PracticeSite, label: string, ph = "", type = "text") => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={(site[k] as any) ?? ""} placeholder={ph}
        onChange={(e) => set(k, e.target.value)}
        className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
    </div>
  );
  const A = (k: keyof PracticeSite, label: string, ph = "") => (
    <div className="md:col-span-2">
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <textarea rows={2} value={(site[k] as any) ?? ""} placeholder={ph}
        onChange={(e) => set(k, e.target.value)}
        className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
    </div>
  );
  const ops = site.operation_types || [];
  const cids = site.course_ids || [];
  const updAuth = (i: number, k: keyof PracticeAuthorization, v: any) =>
    setAuths(auths.map((a, j) => (j === i ? { ...a, [k]: v } : a)));

  return (
    <div className="max-w-4xl">
      <button onClick={onCancel} className="text-sm text-[#0072CE] hover:underline mb-2">← Lugares de práctica</button>
      <h1 className="text-2xl font-bold text-[#003366] mb-4">{site.id ? site.name : "Nuevo lugar de práctica"}</h1>

      <Block title="Identificación">
        {T("name", "Nombre *", "Ej: Zona de vuelo El Arrayán")}
        {T("code", "Código interno", "Ej: SCL-ARR")}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <select value={site.site_type || "zona_vuelo"} onChange={(e) => set("site_type", e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
            {Object.entries(SITE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado</label>
          <select value={site.status || "activo"} onChange={(e) => set("status", e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
            <option value="activo">Activo</option>
            <option value="suspendido">Suspendido</option>
          </select>
        </div>
      </Block>

      <Block title="Ubicación">
        {T("address", "Dirección")}
        {T("comuna", "Comuna")}
        {T("city", "Ciudad", "Se copia a la clase programada")}
        {T("region", "Región")}
        {T("latitude", "Latitud", "-33.3700", "number")}
        {T("longitude", "Longitud", "-70.5000", "number")}
        {T("maps_url", "Link de Google Maps", "Si se omite, se genera con las coordenadas")}
        {T("kml_url", "Polígono del área (link KML/KMZ)")}
      </Block>

      <Block title="Espacio aéreo">
        {T("fir", "FIR", "Ej: SCEZ Santiago")}
        {T("airspace_class", "Clase de espacio aéreo")}
        {T("nearest_aerodrome", "Aeródromo/helipuerto más cercano", "Ej: SCTB Tobalaba")}
        {T("nearest_aerodrome_km", "Distancia (km)", "", "number")}
        {A("restricted_zones", "Zonas restringidas o peligrosas cercanas", "Ej: SC-R25")}
      </Block>

      <Block title="Límites operacionales">
        {T("max_height_agl_m", "Altura máxima (m AGL)", "", "number")}
        {T("max_radius_m", "Radio máximo (m)", "", "number")}
        {T("max_mtom_kg", "MTOM máxima (kg)", "", "number")}
        {T("max_simultaneous_rpa", "RPA simultáneos máx.", "", "number")}
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Tipo de operación permitido</label>
          <div className="flex gap-4">
            {["VLOS", "EVLOS"].map((o) => (
              <label key={o} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={ops.includes(o)} className="rounded"
                  onChange={(e) => set("operation_types", e.target.checked ? [...ops, o] : ops.filter((x) => x !== o))} />
                {o}
              </label>
            ))}
          </div>
        </div>
      </Block>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#003366] uppercase">Autorizaciones</h2>
          <button onClick={() => setAuths([...auths, { authority: "DGAC", reference: null, document_url: null, valid_from: null, valid_until: null, lead_days: null, notes: null }])}
            className="text-xs text-[#0072CE] hover:underline">+ Agregar autorización</button>
        </div>
        {auths.length === 0 ? <p className="text-xs text-gray-400">Sin autorizaciones. Los instructores verán una advertencia al programar.</p> : (
          <div className="space-y-3">
            {auths.map((a, i) => (
              <div key={i} className="grid md:grid-cols-6 gap-2 items-end border border-gray-100 rounded p-3">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Entidad</label>
                  <select value={a.authority} onChange={(e) => updAuth(i, "authority", e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm">
                    {AUTHORITIES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-gray-500 mb-1">Referencia (resolución, oficio, carta)</label>
                  <input value={a.reference || ""} onChange={(e) => updAuth(i, "reference", e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Vigente desde</label>
                  <input type="date" value={a.valid_from || ""} onChange={(e) => updAuth(i, "valid_from", e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Vence</label>
                  <input type="date" value={a.valid_until || ""} onChange={(e) => updAuth(i, "valid_until", e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Antelación (días)</label>
                  <input type="number" min={0} value={a.lead_days ?? ""} onChange={(e) => updAuth(i, "lead_days", e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[11px] text-gray-500 mb-1">Link al documento</label>
                  <input value={a.document_url || ""} onChange={(e) => updAuth(i, "document_url", e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-gray-500 mb-1">Notas</label>
                  <input value={a.notes || ""} onChange={(e) => updAuth(i, "notes", e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                </div>
                <button onClick={() => setAuths(auths.filter((_, j) => j !== i))} className="text-xs text-red-600 hover:underline pb-2">Quitar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Block title="Logística">
        {T("capacity_students", "Capacidad de alumnos", "", "number")}
        {T("availability", "Días y horarios disponibles", "Ej: Lun–Vie 09:00–17:00")}
        {T("contact_name", "Contacto (propietario/encargado)")}
        {T("contact_phone", "Teléfono de contacto")}
        {T("contact_email", "Email de contacto", "", "email")}
        {T("services", "Servicios", "Sombra, baño, energía, estacionamiento")}
      </Block>

      <Block title="Seguridad">
        {T("meeting_point", "Punto de reunión")}
        {T("emergency_phone", "Teléfono de emergencia")}
        {A("nearest_medical_center", "Centro asistencial más cercano")}
        {A("emergency_plan", "Plan de respuesta a emergencias (resumen o link)")}
      </Block>

      <Block title="Uso">
        {A("access_instructions", "Instrucciones de acceso para el alumno", "Cómo llegar, a quién preguntar, qué llevar")}
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Cursos habilitados (ninguno marcado = todos)</label>
          <div className="grid md:grid-cols-2 gap-1 max-h-48 overflow-y-auto border border-gray-100 rounded p-2">
            {courses.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs">
                <input type="checkbox" className="rounded" checked={cids.includes(c.id)}
                  onChange={(e) => set("course_ids", e.target.checked ? [...cids, c.id] : cids.filter((x) => x !== c.id))} />
                {c.code ? `${c.code} — ` : ""}{c.title}
              </label>
            ))}
          </div>
        </div>
        {A("notes", "Notas internas")}
      </Block>

      <div className="flex items-center gap-3 sticky bottom-0 bg-gray-50 py-3">
        <button onClick={onSave} disabled={saving}
          className="bg-[#0072CE] hover:bg-[#005fa3] text-white text-sm font-semibold px-5 py-2 rounded disabled:opacity-50">
          {saving ? "Guardando…" : "Guardar lugar"}
        </button>
        <button onClick={onCancel} className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded">Cancelar</button>
        {msg && <span className={`text-xs ${msg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>{msg}</span>}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
      <h2 className="text-sm font-semibold text-[#003366] uppercase mb-3">{title}</h2>
      <div className="grid md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
