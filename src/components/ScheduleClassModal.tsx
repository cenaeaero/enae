"use client";

import { useState } from "react";

export type ScheduleFields = {
  city: string;
  scheduled_date: string;
  start_time: string;
  location_name: string;
  location_url: string;
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
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!date) { setError("La fecha es requerida"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({ city, scheduled_date: date, start_time: time, location_name: locationName, location_url: locationUrl }, notify);
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
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ciudad</label>
            <input type="text" placeholder="Ej: Antofagasta" value={city} onChange={(e) => setCity(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lugar de la práctica</label>
            <input type="text" placeholder="Ej: Aeródromo Eulogio Sánchez, Tobalaba" value={locationName} onChange={(e) => setLocationName(e.target.value)}
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
