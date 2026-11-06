"use client";

import { useEffect, useMemo, useState } from "react";
import { type PracticeSite, mapsUrlFor, scheduleWarnings } from "@/lib/practice-sites";

export type ScheduleFields = {
  city: string;
  scheduled_date: string;
  start_time: string;
  location_name: string;
  location_url: string;
  practice_site_id: string | null; // lugar del catálogo (null = escrito a mano)
};

// Ventana para programar la clase práctica (fecha, hora, lugar, mapa) de una o
// varias asignaciones a la vez. La usan el admin y el instructor.
export default function ScheduleClassModal({ count, initial, onCancel, onSave }: {
  count: number;
  initial?: Partial<ScheduleFields>;
  onCancel: () => void;
  onSave: (fields: ScheduleFields, notify: boolean) => Promise<void>;
}) {
  const [city, setCity] = useState(initial?.city || "");
  const [date, setDate] = useState(initial?.scheduled_date || "");
  const [time, setTime] = useState(initial?.start_time || "");
  const [locationName, setLocationName] = useState(initial?.location_name || "");
  const [locationUrl, setLocationUrl] = useState(initial?.location_url || "");
  const [siteId, setSiteId] = useState<string>(initial?.practice_site_id || "");
  const [sites, setSites] = useState<PracticeSite[]>([]);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Catálogo de lugares de práctica (si la migración no está, queda vacío y se escribe a mano)
  useEffect(() => {
    fetch("/api/lugares-practica")
      .then((r) => r.json())
      .then((d) => setSites(d.sites || []))
      .catch(() => setSites([]));
  }, []);

  const site = useMemo(() => sites.find((x) => x.id === siteId) || null, [sites, siteId]);
  const warnings = useMemo(() => (site ? scheduleWarnings(site, date || null) : []), [site, date]);

  function pickSite(id: string) {
    setSiteId(id);
    const st = sites.find((x) => x.id === id);
    if (!st) return;
    setCity(st.city || "");
    setLocationName(st.name);
    setLocationUrl(mapsUrlFor(st) || "");
  }

  async function save() {
    if (!date) { setError("La fecha es requerida"); return; }
    if (warnings.length > 0 && !confirm(`Advertencias del lugar:\n\n- ${warnings.join("\n- ")}\n\n¿Programar de todas formas?`)) return;
    setSaving(true);
    setError("");
    try {
      await onSave({ city, scheduled_date: date, start_time: time, location_name: locationName, location_url: locationUrl, practice_site_id: siteId || null }, notify);
    } catch (err: any) {
      setError(err?.message || "Error al guardar");
      setSaving(false);
      return;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !saving && onCancel()}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-100 bg-[#003366] rounded-t-lg flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">📅 Programar clase · {count} alumno{count !== 1 ? "s" : ""}</h3>
          <button onClick={onCancel} className="text-blue-200 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hora de inicio</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
            </div>
          </div>
          {sites.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Lugar de práctica (catálogo ENAE)</label>
              <select value={siteId} onChange={(e) => pickSite(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
                <option value="">— Escribir el lugar manualmente —</option>
                {sites.filter((x) => x.status === "activo" || x.id === siteId).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}{x.city ? ` · ${x.city}` : ""}{x.status === "suspendido" ? " (suspendido)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          {site && (
            <div className="text-[11px] text-gray-600 bg-blue-50 border border-blue-100 rounded p-2 space-y-0.5">
              <p>
                {[site.max_height_agl_m != null ? `Altura máx. ${site.max_height_agl_m} m AGL` : null,
                  site.max_radius_m != null ? `radio ${site.max_radius_m} m` : null,
                  (site.operation_types || []).join("/") || null,
                  site.max_simultaneous_rpa != null ? `${site.max_simultaneous_rpa} RPA simult.` : null,
                  site.capacity_students != null ? `capacidad ${site.capacity_students} alumnos` : null,
                ].filter(Boolean).join(" · ") || "Sin límites registrados"}
              </p>
              {site.restricted_zones && <p>Zonas cercanas: {site.restricted_zones}</p>}
              {site.availability && <p>Disponibilidad: {site.availability}</p>}
              {site.contact_name && <p>Contacto: {site.contact_name}{site.contact_phone ? ` · ${site.contact_phone}` : ""}</p>}
            </div>
          )}
          {warnings.length > 0 && (
            <ul className="text-[11px] text-orange-800 bg-orange-50 border border-orange-200 rounded p-2 list-disc pl-5">
              {warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ciudad</label>
            <input type="text" placeholder="Ej: Antofagasta" value={city} onChange={(e) => { setCity(e.target.value); }}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lugar de la práctica</label>
            <input type="text" placeholder="Ej: Aeródromo Eulogio Sánchez, Tobalaba" value={locationName} onChange={(e) => { setLocationName(e.target.value); if (siteId) setSiteId(""); }}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Link de Google Maps</label>
            <div className="flex gap-2">
              <input type="url" placeholder="https://maps.app.goo.gl/..." value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)}
                className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm" />
              {locationUrl && (
                <a href={locationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0072CE] hover:underline self-center whitespace-nowrap">📍 Ver</a>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 pt-1 cursor-pointer">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="rounded" />
            Avisar a {count === 1 ? "el alumno" : "los alumnos"} por correo (fecha, hora, lugar y datos del instructor)
          </label>
          <p className="text-[11px] text-gray-400">
            Estos datos se aplican a {count === 1 ? "la asignación seleccionada" : `las ${count} asignaciones seleccionadas`} y {count === 1 ? "el alumno los verá" : "los alumnos los verán"} en su portal.
          </p>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onCancel} disabled={saving} className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded disabled:opacity-50">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="text-sm bg-[#0072CE] hover:bg-[#005fa3] text-white font-semibold px-5 py-2 rounded disabled:opacity-50">
            {saving ? "Guardando…" : `Aplicar a ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}
