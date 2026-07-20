"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Row = {
  procedure_id: string;
  registration_id: string;
  name: string;
  email: string;
  rut: string | null;
  course: string;
  procedure_type: string;
  folio_number: string | null;
  dgac_credential_number: string | null;
  exam_datetime: string | null;
  exam_unit_city: string | null;
  unidad_coordinada: boolean;
  solicitud_teoricos_at: string | null;
  checklist_done: number;
  checklist_total: number;
  is_alumni: boolean;
};

const CHECKLIST_FIELDS = [
  "registro_sipa", "solicitud_credencial", "apendice_c", "cedula_identidad",
  "pago_tasa", "examen_practico", "coordinacion_examen",
] as const;

export default function CoordinacionDgacPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ccAlumnos, setCcAlumnos] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    // Vía API admin (service role): el navegador no ve profiles por RLS,
    // y los RUT aparecían como "falta" aunque estén registrados.
    let data: any[] = [];
    let rutByEmail: Record<string, string> = {};
    try {
      const res = await fetch("/api/admin/dgac/coordinacion");
      const json = await res.json();
      if (!res.ok) {
        setMessage(`Error cargando trámites: ${json.error || res.status}`);
        setLoading(false);
        return;
      }
      data = json.procedures || [];
      rutByEmail = json.rut_by_email || {};
    } catch (err: any) {
      setMessage(`Error cargando trámites: ${err.message || "Sin conexión"}`);
      setLoading(false);
      return;
    }

    // Un trámite por inscripción (el más reciente, ya vienen ordenados desc)
    const seen = new Set<string>();
    const mapped: Row[] = [];
    for (const p of (data || []) as any[]) {
      const reg = p.registrations;
      if (!reg || seen.has(reg.id)) continue;
      seen.add(reg.id);
      mapped.push({
        procedure_id: p.id,
        registration_id: reg.id,
        name: `${reg.first_name || ""} ${reg.last_name || ""}`.trim() || reg.email,
        email: reg.email,
        rut: rutByEmail[(reg.email || "").toLowerCase()] || null,
        course: reg.courses ? `${reg.courses.code || ""} ${reg.courses.title || ""}`.trim() : "—",
        procedure_type: p.procedure_type,
        folio_number: p.folio_number,
        dgac_credential_number: p.dgac_credential_number,
        exam_datetime: p.exam_datetime,
        exam_unit_city: p.exam_unit_city,
        unidad_coordinada: p.unidad_coordinada === true,
        solicitud_teoricos_at: p.solicitud_teoricos_at,
        checklist_done: CHECKLIST_FIELDS.filter((f) => p[f] === true).length,
        checklist_total: CHECKLIST_FIELDS.length,
        is_alumni: reg.is_alumni === true,
      });
    }
    setRows(mapped);
    setLoading(false);
  }

  // Búsqueda por nombre, RUT, folio, curso, email o ciudad (sin acentos)
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matchesSearch = (r: Row) => {
    const q = normalize(search.trim());
    if (!q) return true;
    const haystack = normalize(`${r.name} ${r.rut || ""} ${r.folio_number || ""} ${r.course} ${r.email} ${r.exam_unit_city || ""}`);
    return q.split(/\s+/).every((term) => haystack.includes(term));
  };

  const enProceso = rows.filter((r) => !r.dgac_credential_number && matchesSearch(r));
  const completados = rows.filter((r) => !!r.dgac_credential_number && matchesSearch(r));

  function toggleSelect(regId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(regId)) next.delete(regId); else next.add(regId);
      return next;
    });
  }

  function readyToSend(r: Row) {
    return !!r.folio_number && !!r.exam_datetime && !!r.exam_unit_city && !!r.rut &&
      (r.exam_unit_city.trim().toLowerCase() === "santiago" || r.unidad_coordinada);
  }

  async function enviarSolicitud() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const seleccionados = enProceso.filter((r) => ids.includes(r.registration_id));
    const ciudades = Array.from(new Set(seleccionados.map((r) => (r.exam_unit_city || "").trim().toLowerCase() === "santiago" ? "Santiago" : "Provincia")));
    if (ciudades.length > 1) {
      setMessage("Error: no mezclar alumnos de Santiago con alumnos de provincia en un mismo envío.");
      return;
    }
    const tipo = ciudades[0] === "Provincia" ? "apertura del examen en SIPA" : "agendamiento del examen en Santiago";
    if (!confirm(`Se enviará UN correo a teoricosag@dgac.gob.cl solicitando ${tipo} para ${ids.length} alumno(s)${ccAlumnos ? ", con copia a cada alumno" : ""}. ¿Continuar?`)) return;
    setSending(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/dgac/solicitar-examen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_ids: ids, cc_alumnos: ccAlumnos }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(json.missing) && json.missing.length > 0 ? ` — ${json.missing.join("; ")}` : "";
        setMessage(`Error: ${json.error || "No se pudo enviar"}${detail}`);
      } else {
        setMessage(`Solicitud enviada a ${json.sent_to} (${json.count} alumno${json.count > 1 ? "s" : ""}).`);
        setSelected(new Set());
        await load();
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message || "Sin conexión"}`);
    }
    setSending(false);
  }

  async function pasarAAlumni(r: Row) {
    if (!confirm(`¿Pasar a ${r.name} a Ex-alumnos (Alumni)? Su proceso DGAC figura completado (credencial ${r.dgac_credential_number}).`)) return;
    setMarking(r.registration_id);
    const { error } = await supabase
      .from("registrations")
      .update({ is_alumni: true, alumni_at: new Date().toISOString() })
      .eq("id", r.registration_id);
    if (error) setMessage(`Error: ${error.message}`);
    else {
      setMessage(`${r.name} pasado a Alumni.`);
      setRows((prev) => prev.map((x) => x.registration_id === r.registration_id ? { ...x, is_alumni: true } : x));
    }
    setMarking(null);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Coordinación Examen DGAC</h1>
          <p className="text-sm text-gray-500">Solicitudes a Teóricos Licencias (teoricosag@dgac.gob.cl) y cierre de procesos</p>
        </div>
        <button onClick={load} className="text-sm text-[#0072CE] hover:underline">Actualizar</button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${message.startsWith("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {message}
        </div>
      )}

      {/* En proceso */}
      <div className="bg-white rounded-lg border border-gray-200 mb-8">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-semibold text-gray-800">En proceso ({enProceso.length})</h2>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, RUT, folio, curso..."
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-[#0072CE]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-xs text-gray-400 hover:text-gray-600">Limpiar</button>
            )}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={ccAlumnos} onChange={(e) => setCcAlumnos(e.target.checked)} className="rounded" />
              Copia a los alumnos
            </label>
            <button
              onClick={enviarSolicitud}
              disabled={sending || selected.size === 0}
              className="bg-[#0072CE] hover:bg-[#005fa3] text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {sending ? "Enviando..." : `Enviar solicitud a Teóricos (${selected.size})`}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2">Alumno</th>
                <th className="px-4 py-2">RUT / Pasaporte</th>
                <th className="px-4 py-2">Folio</th>
                <th className="px-4 py-2">Examen</th>
                <th className="px-4 py-2">Unidad</th>
                <th className="px-4 py-2">Checklist</th>
                <th className="px-4 py-2">Solicitud</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : enProceso.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No hay trámites en proceso</td></tr>
              ) : enProceso.map((r) => {
                const ready = readyToSend(r);
                const esProvincia = !!r.exam_unit_city && r.exam_unit_city.trim().toLowerCase() !== "santiago";
                return (
                  <tr key={r.procedure_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(r.registration_id)}
                        onChange={() => toggleSelect(r.registration_id)}
                        disabled={!ready}
                        title={!ready ? "Faltan datos (folio, fecha, unidad, RUT o pre-coordinación de la unidad)" : ""}
                        className="rounded disabled:opacity-30"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/admin/registros/inscripcion/${r.registration_id}`} className="text-[#0072CE] hover:underline font-medium">{r.name}</Link>
                      <div className="text-xs text-gray-400">{r.course}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{r.rut || <span className="text-amber-600 text-xs">falta</span>}</td>
                    <td className="px-4 py-2 text-gray-600">{r.folio_number || <span className="text-amber-600 text-xs">falta</span>}</td>
                    <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{r.exam_datetime ? new Date(r.exam_datetime).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }) : <span className="text-amber-600 text-xs">falta</span>}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {r.exam_unit_city || <span className="text-amber-600 text-xs">falta</span>}
                      {esProvincia && (
                        <span className={`block text-[10px] ${r.unidad_coordinada ? "text-green-600" : "text-amber-600"}`}>
                          {r.unidad_coordinada ? "unidad coordinada" : "falta pre-coordinación"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${r.checklist_done === r.checklist_total ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {r.checklist_done}/{r.checklist_total}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {r.solicitud_teoricos_at
                        ? <span className="text-green-700">Enviada {new Date(r.solicitud_teoricos_at).toLocaleDateString("es-CL")}</span>
                        : <span className="text-gray-400">Pendiente</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completados → Alumni */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Proceso completado — pasar a Ex-alumnos ({completados.filter((r) => !r.is_alumni).length})</h2>
          <p className="text-xs text-gray-500 mt-1">Alumnos con N° de Credencial DGAC ingresado. Al pasarlos a Alumni salen del listado de alumnos en proceso.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-2">Alumno</th>
                <th className="px-4 py-2">RUT / Pasaporte</th>
                <th className="px-4 py-2">N° Credencial DGAC</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : completados.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aún no hay procesos completados</td></tr>
              ) : completados.map((r) => (
                <tr key={r.procedure_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/registros/inscripcion/${r.registration_id}`} className="text-[#0072CE] hover:underline font-medium">{r.name}</Link>
                    <div className="text-xs text-gray-400">{r.course}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{r.rut || "—"}</td>
                  <td className="px-4 py-2 text-gray-600">{r.dgac_credential_number}</td>
                  <td className="px-4 py-2">
                    {r.is_alumni
                      ? <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700">Alumni 🎓</span>
                      : <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">En listado activo</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {!r.is_alumni && (
                      <button
                        onClick={() => pasarAAlumni(r)}
                        disabled={marking === r.registration_id}
                        className="bg-[#003366] hover:bg-[#00254d] text-white px-4 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                      >
                        {marking === r.registration_id ? "Guardando..." : "Pasar a Alumni"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
