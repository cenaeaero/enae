"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const GUIA = [
  { icon: "1️⃣", title: "Revisa tus alumnos asignados", detail: "En Mis Alumnos verás cada alumno con su fecha, hora y lugar. Puedes seleccionar varios y usar \"📅 Programar clase\" para fijar los datos de una sola vez.", href: "/instructor/asignaciones", link: "Ir a Mis Alumnos" },
  { icon: "2️⃣", title: "El día de la clase: registra el formato N1", detail: "Abre la asignación del alumno y usa \"📋 Abrir formulario\" para completar la Evaluación Práctica en línea (fases Pre-Solo, Progreso, Final y Chequeo). Puedes guardar borrador y seguir después.", href: "/instructor/asignaciones", link: "Ver asignaciones" },
  { icon: "3️⃣", title: "Ingresa notas y sube documentos", detail: "En la misma asignación registra la nota teórica/práctica, sube la hoja de evaluación firmada y otros documentos (bitácora, fotos, checklist).", href: null, link: null },
  { icon: "4️⃣", title: "Marca como completado", detail: "Al terminar usa \"Guardar y marcar como completado\": el admin queda notificado y al alumno le aparece la evaluación en su portal para firmarla electrónicamente.", href: null, link: null },
  { icon: "5️⃣", title: "Gestiona tus honorarios", detail: "Cuando el admin te proponga un honorario recibirás un correo. Apruébalo o recházalo en Honorarios, y sube tu boleta cuando corresponda. Confirma tus datos bancarios en Mi Perfil.", href: "/instructor/honorarios", link: "Ver honorarios" },
  { icon: "6️⃣", title: "¿Dudas o cambios?", detail: "Escríbele directamente a tus alumnos o al administrador desde Mensajes — los alumnos reciben aviso por correo.", href: "/instructor/mensajes", link: "Abrir Mensajes" },
];

export default function InstructorDashboard() {
  const [asgs, setAsgs] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuia, setShowGuia] = useState(false);

  const [asInstructor, setAsInstructor] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("as_instructor");
    setAsInstructor(q);
    const suffix = q ? `?as_instructor=${q}` : "";
    (async () => {
      const [asgRes, feesRes] = await Promise.all([
        fetch(`/api/instructor/asignaciones${suffix}`).then((r) => r.json()),
        fetch(`/api/instructor/fees${suffix}`).then((r) => r.json()),
      ]);
      setAsgs(asgRes.assignments || []);
      setFees(feesRes.fees || []);
      setLoading(false);
    })();
  }, []);

  const hoy = new Date().toISOString().slice(0, 10);
  const activos = asgs.filter((a) => a.status === "assigned" || a.status === "in_progress");
  const proximas = asgs
    .filter((a) => a.scheduled_date && a.scheduled_date >= hoy && a.status !== "completed" && a.status !== "cancelled")
    .sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || ""));
  const porEvaluar = asgs.filter((a) =>
    a.status !== "cancelled" && a.status !== "completed" &&
    a.scheduled_date && a.scheduled_date < hoy &&
    a.grade_theoretical == null && a.grade_practical == null && !a.evaluation_file_url);
  const feesPendientes = fees.filter((f: any) => f.status === "proposed");

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-[#003366] mb-2">Dashboard</h1>
      {asInstructor && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded text-xs">
          🔍 Modo previsualización admin · viendo como <strong>{asInstructor}</strong>.{" "}
          <a href="/admin/instructores" className="underline">Volver al admin</a>
        </div>
      )}
      {loading ? <p className="text-gray-400">Cargando…</p> : (
        <>
          {/* Alertas de acción */}
          {(porEvaluar.length > 0 || feesPendientes.length > 0) && (
            <div className="mb-4 space-y-2">
              {porEvaluar.length > 0 && (
                <Link href="/instructor/asignaciones" className="block bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-lg text-sm hover:bg-amber-100 transition">
                  ⚠️ Tienes <strong>{porEvaluar.length} clase{porEvaluar.length !== 1 ? "s" : ""} pasada{porEvaluar.length !== 1 ? "s" : ""} sin evaluación registrada</strong> — completa el formato N1 y las notas.
                </Link>
              )}
              {feesPendientes.length > 0 && (
                <Link href="/instructor/honorarios" className="block bg-purple-50 border border-purple-200 text-purple-800 px-4 py-2.5 rounded-lg text-sm hover:bg-purple-100 transition">
                  💰 Tienes <strong>{feesPendientes.length} honorario{feesPendientes.length !== 1 ? "s" : ""} propuesto{feesPendientes.length !== 1 ? "s" : ""}</strong> esperando tu aprobación.
                </Link>
              )}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card label="Próximas clases" value={proximas.length} color="bg-blue-50 text-[#0072CE]" />
            <Card label="Por evaluar" value={porEvaluar.length} color="bg-amber-50 text-amber-700" />
            <Card label="Alumnos activos" value={activos.length} color="bg-white text-[#003366] border border-gray-200" />
            <Card label="Completados" value={asgs.filter((a) => a.status === "completed").length} color="bg-green-50 text-green-700" />
          </div>

          {/* Próximas clases */}
          <div className="bg-white border border-gray-200 rounded-lg mb-4 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#003366]">📅 Próximas clases</h2>
              <Link href="/instructor/asignaciones" className="text-xs text-[#0072CE] hover:underline">Ver todas →</Link>
            </div>
            {proximas.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">No tienes clases programadas próximamente.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {proximas.slice(0, 5).map((a) => (
                  <Link key={a.id} href={`/instructor/asignaciones/${a.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-blue-50 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#003366]">{a.registrations?.last_name}, {a.registrations?.first_name}</p>
                      <p className="text-xs text-gray-500">{a.registrations?.courses?.title || ""}</p>
                    </div>
                    <div className="text-right text-xs text-gray-600">
                      <p className={a.scheduled_date === hoy ? "font-bold text-[#0072CE]" : "font-medium"}>
                        {a.scheduled_date === hoy ? "HOY" : new Date(a.scheduled_date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                        {a.start_time ? ` · ${a.start_time}` : ""}
                      </p>
                      <p className="text-gray-400">{a.location_name || a.city || ""}</p>
                      <p className="text-[10px] mt-0.5">{a.notified_at ? <span className="text-green-600">✓ Alumno avisado</span> : <span className="text-amber-600">Sin avisar</span>}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Mesa de ayuda / guía */}
          <div className="bg-white border border-gray-200 rounded-lg mb-4 overflow-hidden">
            <button onClick={() => setShowGuia(!showGuia)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
              <h2 className="text-sm font-semibold text-[#003366]">🛟 Mesa de Ayuda — ¿Qué debo hacer y cómo?</h2>
              <span className="text-gray-400 text-xs">{showGuia ? "▲ Ocultar" : "▼ Ver guía"}</span>
            </button>
            {showGuia && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {GUIA.map((g) => (
                  <div key={g.title} className="px-5 py-3 flex gap-3">
                    <span className="text-lg shrink-0">{g.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{g.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{g.detail}</p>
                      {g.href && <Link href={g.href} className="text-xs text-[#0072CE] hover:underline">{g.link} →</Link>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accesos rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/instructor/asignaciones" className="block bg-[#0072CE] hover:bg-[#005fa3] text-white px-4 py-3 rounded-lg text-sm font-medium text-center">🎓 Mis Alumnos</Link>
            <Link href="/instructor/mensajes" className="block bg-[#003366] hover:bg-[#001d3d] text-white px-4 py-3 rounded-lg text-sm font-medium text-center">💬 Mensajes</Link>
            <Link href="/instructor/honorarios" className="block bg-gray-700 hover:bg-gray-800 text-white px-4 py-3 rounded-lg text-sm font-medium text-center">💰 Honorarios</Link>
            <Link href="/instructor/perfil" className="block bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg text-sm font-medium text-center">👤 Mi Perfil</Link>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg p-4 ${color}`}>
      <p className="text-xs uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
