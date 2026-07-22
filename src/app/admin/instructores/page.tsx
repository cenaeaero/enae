"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import NewRoleProfileModal from "@/components/NewRoleProfileModal";
import ScheduleClassModal, { type ScheduleFields } from "@/components/ScheduleClassModal";

// ── Tipos ────────────────────────────────────────────────────────────────────
type Course = { id: string; title: string; code: string | null };

type Instructor = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  rut: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  bank_account_confirmed_at: string | null;
};

type CourseAssignment = {
  id: string;
  instructor_email: string;
  course_id: string;
  created_at: string;
  course?: { title: string; code: string | null } | null;
};

type StudentAssignment = {
  id: string;
  instructor_email: string;
  registration_id: string;
  kind: string;
  city: string | null;
  scheduled_date: string | null;
  start_time: string | null;
  notified_at: string | null;
  status: string;
  grade_theoretical: number | null;
  grade_practical: number | null;
  observations: string | null;
  evaluation_file_url: string | null;
  completed_at: string | null;
  instructor_assignment_documents?: { id: string; file_name: string; file_path: string; uploaded_at: string }[];
  practical_evaluations?: { id: string; status: string; pre_solo_result: string | null; completed_at: string | null } | { id: string; status: string; pre_solo_result: string | null; completed_at: string | null }[] | null;
  registrations?: {
    id: string; first_name: string; last_name: string; email: string;
    organization?: string | null;
    courses?: { title: string; code: string | null } | null;
  } | null;
};

type Fee = {
  id: string;
  instructor_email: string;
  registration_id: string | null;
  amount: number;
  status: string;
  payment_date: string | null;
  payment_amount: number | null;
  receipt_file_url: string | null;
  notes: string | null;
  created_at: string;
  registrations?: { first_name: string; last_name: string; courses?: { title: string; code: string | null } | null } | null;
};

const KIND_LABEL: Record<string, string> = { theoretical: "Teórico", practical: "Práctico", both: "T + P" };
const STATUS_LABEL: Record<string, string> = { assigned: "Asignado", in_progress: "En proceso", completed: "Completado", cancelled: "Cancelado" };
const FEE_LABEL: Record<string, string> = { proposed: "Propuesto", approved: "Aprobado", paid: "Pagado", rejected: "Rechazado" };
const CLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

// ── Página ───────────────────────────────────────────────────────────────────
export default function AdminInstructoresPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [selectedEmail, setSelectedEmail] = useState("");
  const [tab, setTab] = useState<"resumen" | "alumnos" | "honorarios" | "evaluaciones">("resumen");
  const [search, setSearch] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showFee, setShowFee] = useState(false);
  const [selAsg, setSelAsg] = useState<Set<string>>(new Set());
  const [showSchedule, setShowSchedule] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [{ data: c }, profsRes, ciRes, saRes, feesRes] = await Promise.all([
      supabase.from("courses").select("id, title, code").eq("is_active", true).order("title"),
      fetch("/api/admin/perfiles").then((r) => r.json()),
      fetch("/api/admin/instructores").then((r) => r.json()),
      fetch("/api/admin/instructor-assignments").then((r) => r.json()),
      fetch("/api/admin/instructor-fees").then((r) => r.json()),
    ]);
    setCourses((c as Course[]) || []);
    const insts = (profsRes.profiles || []).filter((p: any) => p.role === "instructor");
    setInstructors(insts.map((p: any) => ({
      id: p.id, first_name: p.first_name || "", last_name: p.last_name || "",
      email: p.email, rut: p.rut, phone: p.phone, city: p.city, address: p.address,
      bank_account_confirmed_at: p.bank_account_confirmed_at,
    })));
    setCourseAssignments(ciRes.assignments || []);
    setStudentAssignments(saRes.assignments || []);
    setFees(feesRes.fees || []);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  // ── Derivados por instructor seleccionado ──────────────────────────────────
  const selected = instructors.find((i) => i.email === selectedEmail) || null;

  const perInstructor = useMemo(() => {
    const m: Record<string, { alumnos: number; activos: number; pendientes: number }> = {};
    for (const i of instructors) m[i.email] = { alumnos: 0, activos: 0, pendientes: 0 };
    for (const a of studentAssignments) {
      const e = a.instructor_email;
      if (!m[e]) m[e] = { alumnos: 0, activos: 0, pendientes: 0 };
      m[e].alumnos++;
      if (a.status === "assigned" || a.status === "in_progress") m[e].activos++;
    }
    for (const f of fees) {
      const e = f.instructor_email;
      if (!m[e]) m[e] = { alumnos: 0, activos: 0, pendientes: 0 };
      if (f.status === "proposed" || f.status === "approved") m[e].pendientes += Number(f.amount) || 0;
    }
    return m;
  }, [instructors, studentAssignments, fees]);

  // Ordenados por fecha de clase: los más próximos primero, sin fecha al final
  const myAssignments = useMemo(
    () => studentAssignments
      .filter((a) => a.instructor_email === selectedEmail)
      .sort((a, b) => {
        if (!a.scheduled_date && !b.scheduled_date) return 0;
        if (!a.scheduled_date) return 1;
        if (!b.scheduled_date) return -1;
        return a.scheduled_date.localeCompare(b.scheduled_date);
      }),
    [studentAssignments, selectedEmail]);
  const myCourses = useMemo(
    () => courseAssignments.filter((a) => a.instructor_email === selectedEmail),
    [courseAssignments, selectedEmail]);
  const myFees = useMemo(
    () => fees.filter((f) => f.instructor_email === selectedEmail),
    [fees, selectedEmail]);
  const practicalEval = (a: StudentAssignment) => {
    const pe = a.practical_evaluations;
    if (!pe) return null;
    return Array.isArray(pe) ? (pe[0] || null) : pe;
  };
  const myEvals = useMemo(
    () => myAssignments.filter((a) => a.grade_theoretical != null || a.grade_practical != null || a.evaluation_file_url || a.observations || (a.instructor_assignment_documents || []).length > 0 || practicalEval(a)),
    [myAssignments]);

  const kpi = useMemo(() => ({
    activos: myAssignments.filter((a) => a.status === "assigned" || a.status === "in_progress").length,
    completados: myAssignments.filter((a) => a.status === "completed").length,
    cursos: myCourses.length,
    pendiente: myFees.filter((f) => f.status === "proposed" || f.status === "approved").reduce((s, f) => s + (Number(f.amount) || 0), 0),
    pagado: myFees.filter((f) => f.status === "paid").reduce((s, f) => s + (Number(f.payment_amount ?? f.amount) || 0), 0),
  }), [myAssignments, myCourses, myFees]);

  const filteredInstructors = useMemo(() => {
    const term = search.toLowerCase();
    return [...instructors]
      .filter((i) => !term ||
        `${i.first_name} ${i.last_name}`.toLowerCase().includes(term) ||
        i.email.toLowerCase().includes(term) ||
        (i.rut || "").toLowerCase().includes(term))
      .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
  }, [instructors, search]);

  // ── Acciones ───────────────────────────────────────────────────────────────
  async function quitarAlumno(id: string) {
    if (!confirm("¿Quitar esta asignación alumno-instructor?")) return;
    await fetch(`/api/admin/instructor-assignments?id=${id}`, { method: "DELETE" });
    loadAll();
  }

  async function quitarCurso(id: string) {
    if (!confirm("¿Quitar la habilitación de este curso?")) return;
    await fetch(`/api/admin/instructores?id=${id}`, { method: "DELETE" });
    loadAll();
  }

  async function asignarCurso(courseId: string) {
    if (!courseId || !selected) return;
    const res = await fetch("/api/admin/instructores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructor_email: selected.email, course_id: courseId }),
    });
    if (!res.ok) { const d = await res.json(); setMessage(`Error: ${d.error || "no se pudo asignar"}`); }
    loadAll();
  }

  async function notificarPractica() {
    if (!selected || selAsg.size === 0) return;
    if (!confirm(`Se enviarán los datos de la clase práctica por correo:\n\n· Al instructor ${selected.first_name}: tabla con nombre, RUT, email y teléfono de los ${selAsg.size} alumno(s).\n· A cada alumno: datos del instructor (teléfono/email), fecha, hora y lugar con link de Google Maps.\n\n¿Continuar?`)) return;
    setSendingNotif(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/notificar-practica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_ids: Array.from(selAsg) }),
      });
      const d = await res.json();
      if (!res.ok) setMessage(`Error: ${d.error || "No se pudo notificar"}`);
      else {
        const parts = [];
        if (d.sent_instructor) parts.push(`instructor notificado`);
        if (d.sent_students > 0) parts.push(`${d.sent_students} alumno${d.sent_students !== 1 ? "s" : ""} notificado${d.sent_students !== 1 ? "s" : ""}`);
        const fallas = Array.isArray(d.failures) && d.failures.length > 0 ? ` — Fallas: ${d.failures.join("; ")}` : "";
        setMessage(`✓ Correos enviados (${parts.join(" y ")}).${fallas}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message || "Sin conexión"}`);
    }
    setSendingNotif(false);
  }

  async function feeStatus(id: string, status: string) {
    await fetch("/api/admin/instructor-fees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadAll();
  }

  async function eliminarFee(id: string) {
    if (!confirm("¿Eliminar este honorario?")) return;
    await fetch(`/api/admin/instructor-fees?id=${id}`, { method: "DELETE" });
    loadAll();
  }

  const initials = (i: Instructor) =>
    `${(i.first_name || " ")[0] || ""}${(i.last_name || " ")[0] || ""}`.toUpperCase() || "?";

  // El instructor ya ingresó datos del alumno (nota, hoja u observaciones)
  const isEvaluated = (a: StudentAssignment) =>
    a.grade_theoretical != null || a.grade_practical != null || !!a.evaluation_file_url;

  // Los archivos se guardan como rutas de storage privado → URL firmada
  async function openFile(bucket: string, path: string) {
    const res = await fetch(`/api/instructor/upload?bucket=${bucket}&path=${encodeURIComponent(path)}`).then((r) => r.json());
    if (res.url) window.open(res.url, "_blank");
    else setMessage(`Error: no se pudo abrir el archivo (${res.error || "sin URL"})`);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100vh-0px)] bg-[#F3F4F6]">
      {/* ── Panel maestro: lista de instructores ── */}
      <aside className="w-full md:w-80 shrink-0 bg-white border-r border-gray-200 flex flex-col md:h-full max-h-72 md:max-h-none">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-bold text-[#003366]">Instructores</h1>
            <button onClick={() => setShowNew(true)}
              className="text-xs bg-[#0072CE] hover:bg-[#005fa3] text-white font-semibold px-3 py-1.5 rounded">
              + Nuevo
            </button>
          </div>
          <input type="search" placeholder="Buscar nombre, email, RUT…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0072CE]" />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <p className="p-4 text-sm text-gray-400">Cargando…</p>
          ) : filteredInstructors.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">Sin instructores{search ? ` para "${search}"` : ""}.</p>
          ) : filteredInstructors.map((i) => {
            const st = perInstructor[i.email] || { alumnos: 0, activos: 0, pendientes: 0 };
            const active = i.email === selectedEmail;
            return (
              <button key={i.id} onClick={() => { setSelectedEmail(i.email); setTab("resumen"); setMessage(""); setSelAsg(new Set()); }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition ${active ? "bg-blue-50 border-l-4 border-[#0072CE]" : "hover:bg-gray-50 border-l-4 border-transparent"}`}>
                <span className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${active ? "bg-[#0072CE] text-white" : "bg-gray-200 text-gray-600"}`}>
                  {initials(i)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#003366] truncate">{i.last_name}, {i.first_name}</span>
                  <span className="block text-xs text-gray-500 truncate">{i.email}</span>
                  <span className="flex gap-2 mt-0.5 text-[10px]">
                    {st.activos > 0 && <span className="bg-blue-100 text-blue-700 px-1.5 rounded">{st.activos} activo{st.activos !== 1 ? "s" : ""}</span>}
                    {st.pendientes > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 rounded">{CLP.format(st.pendientes)} pend.</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t border-gray-100 text-[11px] text-gray-400">
          {instructors.length} instructor{instructors.length !== 1 ? "es" : ""} registrado{instructors.length !== 1 ? "s" : ""}
        </div>
      </aside>

      {/* ── Área de trabajo ── */}
      <main className="flex-1 md:h-full md:overflow-y-auto">
        {!selected ? (
          <div className="h-full flex items-center justify-center p-12">
            <div className="text-center text-gray-400">
              <p className="text-5xl mb-3">🧑‍🏫</p>
              <p className="font-medium">Selecciona un instructor del panel izquierdo</p>
              <p className="text-sm mt-1">o crea uno nuevo con "+ Nuevo"</p>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-4">
            {/* Barra de comandos */}
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="text-xs text-gray-400">Instructores <span className="mx-1">›</span> <span className="text-gray-700 font-medium">{selected.first_name} {selected.last_name}</span></span>
              <span className="flex-1" />
              <button onClick={() => setShowAssign(true)} className="text-[#0072CE] hover:underline font-medium">＋ Asignar alumnos</button>
              <button onClick={() => setShowFee(true)} className="text-[#0072CE] hover:underline font-medium">＋ Honorario</button>
              <a href={`/admin/perfiles?id=${selected.id}`} className="text-[#0072CE] hover:underline">✏️ Editar perfil</a>
              <a href={`/instructor?as_instructor=${encodeURIComponent(selected.email)}`} target="_blank" rel="noopener noreferrer"
                className="text-[#0072CE] hover:underline">👁 Ver como</a>
            </div>

            {message && (
              <div className={`px-4 py-2 rounded-lg text-sm border ${message.startsWith("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
                {message}
              </div>
            )}

            {/* Encabezado de ficha */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-wrap items-center gap-4">
              <span className="w-16 h-16 rounded-full bg-[#003366] text-white flex items-center justify-center text-xl font-bold">
                {initials(selected)}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-[#003366]">{selected.first_name} {selected.last_name}</h2>
                <p className="text-sm text-gray-500">{selected.email}{selected.phone ? ` · ${selected.phone}` : ""}{selected.rut ? ` · ${selected.rut}` : ""}</p>
              </div>
              {selected.bank_account_confirmed_at ? (
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full">✓ Datos bancarios confirmados</span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Datos bancarios pendientes</span>
              )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Alumnos activos", value: String(kpi.activos), color: "text-[#0072CE]" },
                { label: "Completados", value: String(kpi.completados), color: "text-green-600" },
                { label: "Cursos habilitados", value: String(kpi.cursos), color: "text-[#003366]" },
                { label: "Honorarios pendientes", value: CLP.format(kpi.pendiente), color: "text-amber-600" },
                { label: "Honorarios pagados", value: CLP.format(kpi.pagado), color: "text-green-700" },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                  <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-[11px] text-gray-500">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Pestañas */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="flex border-b border-gray-200 text-sm overflow-x-auto">
                {([
                  ["resumen", "Resumen"],
                  ["alumnos", `Alumnos (${myAssignments.length})`],
                  ["honorarios", `Honorarios (${myFees.length})`],
                  ["evaluaciones", `Evaluaciones (${myEvals.length})`],
                ] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)}
                    className={`px-5 py-3 font-medium whitespace-nowrap border-b-2 -mb-px transition ${tab === key ? "border-[#0072CE] text-[#0072CE]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Resumen ── */}
              {tab === "resumen" && (
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      ["Nombre", `${selected.first_name} ${selected.last_name}`],
                      ["Email", selected.email],
                      ["RUT", selected.rut || "—"],
                      ["Teléfono", selected.phone || "—"],
                      ["Ciudad", selected.city || "—"],
                      ["Dirección", selected.address || "—"],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">{l}</p>
                        <p className="text-sm text-gray-800">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Cursos habilitados</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {myCourses.length === 0 && <span className="text-sm text-gray-400">Sin cursos habilitados.</span>}
                      {myCourses.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1.5 bg-blue-50 text-[#003366] text-xs px-2.5 py-1 rounded-full border border-blue-100">
                          {a.course?.title || a.course_id}{a.course?.code ? ` (${a.course.code})` : ""}
                          <button onClick={() => quitarCurso(a.id)} className="text-red-400 hover:text-red-600 font-bold" title="Quitar">×</button>
                        </span>
                      ))}
                    </div>
                    <select defaultValue="" onChange={(e) => { asignarCurso(e.target.value); e.target.value = ""; }}
                      className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white">
                      <option value="">＋ Habilitar en curso…</option>
                      {courses.filter((c) => !myCourses.some((a) => a.course_id === c.id)).map((c) => (
                        <option key={c.id} value={c.id}>{c.title}{c.code ? ` (${c.code})` : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ── Alumnos ── */}
              {tab === "alumnos" && (
                <div className="overflow-x-auto">
                  {myAssignments.length > 0 && (
                    <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-3 flex-wrap bg-gray-50/50">
                      <span className="text-xs text-gray-500">{selAsg.size} seleccionado{selAsg.size !== 1 ? "s" : ""}</span>
                      <button
                        onClick={() => setShowSchedule(true)}
                        disabled={selAsg.size === 0}
                        className="text-xs bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium px-3 py-1.5 rounded disabled:opacity-40">
                        📅 Programar clase ({selAsg.size})
                      </button>
                      <button
                        onClick={notificarPractica}
                        disabled={selAsg.size === 0 || sendingNotif}
                        className="text-xs bg-[#003366] hover:bg-[#00254d] text-white font-medium px-3 py-1.5 rounded disabled:opacity-40">
                        {sendingNotif ? "Enviando…" : `✉️ Enviar datos (${selAsg.size})`}
                      </button>
                      <button
                        onClick={() => { window.location.href = `/api/instructor/practical-eval/batch?format=pdf&ids=${Array.from(selAsg).join(",")}`; }}
                        disabled={selAsg.size === 0}
                        className="text-xs bg-gray-700 hover:bg-gray-800 text-white font-medium px-3 py-1.5 rounded disabled:opacity-40"
                        title="Descarga en PDF los formularios de evaluación prellenados">
                        ⬇️ Formularios PDF ({selAsg.size})
                      </button>
                      <span className="text-[11px] text-gray-400">Programa en lote, envía datos por correo o descarga los formularios para la clase.</span>
                    </div>
                  )}
                  {myAssignments.length === 0 ? (
                    <p className="p-6 text-sm text-gray-400">Sin alumnos asignados. Usa "＋ Asignar alumnos" en la barra superior.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                          <th className="px-5 py-2 w-8">
                            <input type="checkbox"
                              checked={selAsg.size === myAssignments.length && myAssignments.length > 0}
                              onChange={(e) => setSelAsg(e.target.checked ? new Set(myAssignments.map((a) => a.id)) : new Set())}
                              className="rounded" />
                          </th>
                          <th className="px-5 py-2">Alumno</th>
                          <th className="px-5 py-2">Curso</th>
                          <th className="px-5 py-2">Tipo</th>
                          <th className="px-5 py-2">Ciudad · Fecha ↑</th>
                          <th className="px-5 py-2">Estado</th>
                          <th className="px-5 py-2">Evaluación</th>
                          <th className="px-5 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {myAssignments.map((a) => {
                          const hoy = new Date().toISOString().slice(0, 10);
                          const proxima = !!a.scheduled_date && a.scheduled_date >= hoy && a.status !== "completed" && a.status !== "cancelled";
                          return (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-5 py-2.5">
                              <input type="checkbox" checked={selAsg.has(a.id)}
                                onChange={() => setSelAsg((prev) => { const n = new Set(prev); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })}
                                className="rounded" />
                            </td>
                            <td className="px-5 py-2.5">
                              {a.registrations ? (
                                <a href={`/admin/registros/inscripcion/${a.registration_id}`} className="font-medium text-[#0072CE] hover:underline">
                                  {a.registrations.last_name}, {a.registrations.first_name}
                                </a>
                              ) : "—"}
                            </td>
                            <td className="px-5 py-2.5 text-xs text-gray-600">{a.registrations?.courses?.title || "—"}</td>
                            <td className="px-5 py-2.5 text-xs">{KIND_LABEL[a.kind] || a.kind}</td>
                            <td className={`px-5 py-2.5 text-xs ${proxima ? "font-semibold text-[#003366]" : "text-gray-600"}`}>
                              {[a.city, a.scheduled_date].filter(Boolean).join(" · ") || "—"}{a.start_time ? ` · ${a.start_time}` : ""}
                              {proxima && a.scheduled_date === hoy && <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">HOY</span>}
                              {a.notified_at && <span className="block mt-0.5 text-[10px] text-green-600" title={`Avisado el ${new Date(a.notified_at).toLocaleString("es-CL")}`}>✓ Avisado</span>}
                            </td>
                            <td className="px-5 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                a.status === "completed" ? "bg-green-100 text-green-700" :
                                a.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                                a.status === "cancelled" ? "bg-gray-100 text-gray-500" :
                                "bg-amber-100 text-amber-700"}`}>
                                {STATUS_LABEL[a.status] || a.status}
                              </span>
                            </td>
                            <td className="px-5 py-2.5">
                              {isEvaluated(a) ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded whitespace-nowrap" title={`Teo: ${a.grade_theoretical ?? "—"} · Prá: ${a.grade_practical ?? "—"}${a.evaluation_file_url ? " · Hoja subida" : ""}`}>
                                  ✓ Evaluado{a.grade_practical != null ? ` · ${a.grade_practical}%` : a.grade_theoretical != null ? ` · ${a.grade_theoretical}%` : ""}
                                </span>
                              ) : (
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Sin evaluar</span>
                              )}
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <button onClick={() => quitarAlumno(a.id)} className="text-xs text-red-500 hover:underline">Quitar</button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ── Honorarios ── */}
              {tab === "honorarios" && (
                <div className="overflow-x-auto">
                  {myFees.length === 0 ? (
                    <p className="p-6 text-sm text-gray-400">Sin honorarios. Usa "＋ Honorario" en la barra superior.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                          <th className="px-5 py-2">Fecha</th>
                          <th className="px-5 py-2">Alumno / Concepto</th>
                          <th className="px-5 py-2">Monto</th>
                          <th className="px-5 py-2">Estado</th>
                          <th className="px-5 py-2">Boleta</th>
                          <th className="px-5 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {myFees.map((f) => (
                          <tr key={f.id} className="hover:bg-gray-50">
                            <td className="px-5 py-2.5 text-xs text-gray-600">{new Date(f.created_at).toLocaleDateString("es-CL")}</td>
                            <td className="px-5 py-2.5 text-xs">
                              {f.registrations ? `${f.registrations.last_name}, ${f.registrations.first_name}` : (f.notes || "—")}
                              {f.registrations?.courses?.title && <span className="block text-gray-400">{f.registrations.courses.title}</span>}
                            </td>
                            <td className="px-5 py-2.5 font-medium">{CLP.format(Number(f.amount) || 0)}</td>
                            <td className="px-5 py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                f.status === "paid" ? "bg-green-100 text-green-700" :
                                f.status === "approved" ? "bg-blue-100 text-blue-700" :
                                f.status === "rejected" ? "bg-red-100 text-red-600" :
                                "bg-amber-100 text-amber-700"}`}>
                                {FEE_LABEL[f.status] || f.status}
                              </span>
                              {f.status === "paid" && f.payment_date && <span className="block text-[10px] text-gray-400 mt-0.5">{f.payment_date}</span>}
                            </td>
                            <td className="px-5 py-2.5 text-xs">
                              {f.receipt_file_url ? <button onClick={() => openFile("instructor-receipts", f.receipt_file_url!)} className="text-[#0072CE] hover:underline">Ver boleta</button> : "—"}
                            </td>
                            <td className="px-5 py-2.5 text-right space-x-3 whitespace-nowrap">
                              {f.status === "proposed" && (
                                <button onClick={() => feeStatus(f.id, "approved")} className="text-xs text-[#0072CE] hover:underline">Aprobar</button>
                              )}
                              {f.status !== "paid" && (
                                <a href="/admin/honorarios" className="text-xs text-green-600 hover:underline">Pagar…</a>
                              )}
                              {f.status !== "paid" && (
                                <button onClick={() => eliminarFee(f.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <p className="px-5 py-3 text-[11px] text-gray-400 border-t border-gray-50">
                    El registro de pago completo (fecha, banco, referencia) se gestiona en <a href="/admin/honorarios" className="text-[#0072CE] hover:underline">Honorarios</a>.
                  </p>
                </div>
              )}

              {/* ── Evaluaciones ── */}
              {tab === "evaluaciones" && (
                <div className="overflow-x-auto">
                  {myEvals.length === 0 ? (
                    <p className="p-6 text-sm text-gray-400">Aún no hay evaluaciones registradas por este instructor.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                          <th className="px-5 py-2">Alumno</th>
                          <th className="px-5 py-2">Curso</th>
                          <th className="px-5 py-2">Teórico</th>
                          <th className="px-5 py-2">Práctico</th>
                          <th className="px-5 py-2">Observaciones</th>
                          <th className="px-5 py-2">Formato N1</th>
                          <th className="px-5 py-2">Hoja</th>
                          <th className="px-5 py-2">Documentos</th>
                          <th className="px-5 py-2">Completado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {myEvals.map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-5 py-2.5">
                              {a.registrations ? (
                                <a href={`/admin/registros/inscripcion/${a.registration_id}`} className="font-medium text-[#0072CE] hover:underline">
                                  {a.registrations.last_name}, {a.registrations.first_name}
                                </a>
                              ) : "—"}
                            </td>
                            <td className="px-5 py-2.5 text-xs text-gray-600">{a.registrations?.courses?.title || "—"}</td>
                            <td className="px-5 py-2.5 text-xs">{a.grade_theoretical != null ? <strong>{a.grade_theoretical}%</strong> : "—"}</td>
                            <td className="px-5 py-2.5 text-xs">{a.grade_practical != null ? <strong>{a.grade_practical}%</strong> : "—"}</td>
                            <td className="px-5 py-2.5 text-xs text-gray-600 max-w-[240px]"><span className="line-clamp-2 italic">{a.observations || "—"}</span></td>
                            <td className="px-5 py-2.5 text-xs whitespace-nowrap">
                              {(() => {
                                const pe = practicalEval(a);
                                if (!pe) return <span className="text-gray-400">—</span>;
                                return (
                                  <span className="inline-flex items-center gap-1.5">
                                    <a href={`/instructor/asignaciones/${a.id}/evaluacion`} target="_blank" rel="noopener noreferrer"
                                      className={`px-2 py-0.5 rounded hover:underline ${pe.status === "completed" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}
                                      title={pe.pre_solo_result ? `Pre-Solo: ${pe.pre_solo_result}` : ""}>
                                      {pe.status === "completed" ? "✓ Completada" : "Borrador"}
                                    </a>
                                    <a href={`/api/practica-evaluacion-pdf?assignment_id=${a.id}`}
                                      className="text-[#0072CE] hover:underline" title="Descargar PDF firmado (ISO/DGAC)">⬇️</a>
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-5 py-2.5 text-xs">
                              {a.evaluation_file_url ? <button onClick={() => openFile("instructor-evaluations", a.evaluation_file_url!)} className="text-[#0072CE] hover:underline">Ver hoja</button> : "—"}
                            </td>
                            <td className="px-5 py-2.5 text-xs space-y-0.5">
                              {(a.instructor_assignment_documents || []).length === 0 ? "—" :
                                (a.instructor_assignment_documents || []).map((d) => (
                                  <button key={d.id} onClick={() => openFile("instructor-documents", d.file_path)}
                                    className="block text-[#0072CE] hover:underline text-left truncate max-w-[160px]" title={d.file_name}>
                                    📎 {d.file_name}
                                  </button>
                                ))}
                            </td>
                            <td className="px-5 py-2.5 text-xs text-gray-500">{a.completed_at ? new Date(a.completed_at).toLocaleDateString("es-CL") : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Ventanas modales ── */}
      {showNew && (
        <NewRoleProfileModal role="instructor" title="Nuevo instructor"
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); loadAll(); }} />
      )}
      {showAssign && selected && (
        <AssignStudentsModal instructor={selected} courses={courses}
          onClose={() => setShowAssign(false)}
          onDone={(msg) => { setShowAssign(false); setMessage(msg); loadAll(); }} />
      )}
      {showFee && selected && (
        <NewFeeModal instructor={selected} assignments={myAssignments}
          onClose={() => setShowFee(false)}
          onDone={(msg) => { setShowFee(false); setMessage(msg); loadAll(); }} />
      )}
      {showSchedule && selAsg.size > 0 && (() => {
        const first = myAssignments.find((a) => selAsg.has(a.id));
        return (
          <ScheduleClassModal
            count={selAsg.size}
            initial={{ city: first?.city || "", scheduled_date: first?.scheduled_date || "" }}
            onCancel={() => setShowSchedule(false)}
            onSave={async (fields: ScheduleFields, notify: boolean) => {
              const ids = Array.from(selAsg);
              const res = await fetch("/api/admin/instructor-assignments", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, fields }),
              });
              const d = await res.json();
              if (!res.ok) throw new Error(d.error || "No se pudo programar");
              let avisados = 0;
              if (notify) {
                const nres = await fetch("/api/admin/notificar-practica", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ assignment_ids: ids, to_students: true, to_instructor: false }),
                });
                const nd = await nres.json().catch(() => ({}));
                avisados = nd.sent_students || 0;
              }
              setShowSchedule(false);
              setMessage(`✓ Clase programada para ${ids.length} alumno${ids.length !== 1 ? "s" : ""} (${fields.scheduled_date}${fields.start_time ? " · " + fields.start_time : ""})${notify ? ` · ${avisados} avisado${avisados !== 1 ? "s" : ""} por correo` : ""}.`);
              setSelAsg(new Set());
              loadAll();
            }}
          />
        );
      })()}
    </div>
  );
}

// ── Ventana: asignar alumnos ─────────────────────────────────────────────────
function AssignStudentsModal({ instructor, courses, onClose, onDone }: {
  instructor: Instructor;
  courses: Course[];
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [courseId, setCourseId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<"theoretical" | "practical" | "both">("practical");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [term, setTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!courseId) { setStudents([]); setPicked(new Set()); return; }
    (async () => {
      const { data } = await supabase
        .from("registrations")
        .select("id, first_name, last_name, email, organization, status")
        .eq("course_id", courseId)
        .in("status", ["confirmed", "completed"])
        .order("last_name");
      setStudents(data || []);
      setPicked(new Set());
    })();
  }, [courseId]);

  const visible = useMemo(() => {
    const t = term.toLowerCase();
    if (!t) return students;
    return students.filter((s: any) =>
      (s.first_name || "").toLowerCase().includes(t) ||
      (s.last_name || "").toLowerCase().includes(t) ||
      (s.email || "").toLowerCase().includes(t) ||
      (s.organization || "").toLowerCase().includes(t));
  }, [students, term]);

  async function save() {
    if (picked.size === 0) { setError("Selecciona al menos un alumno"); return; }
    setSaving(true); setError("");
    let ok = 0, fail = 0;
    for (const regId of picked) {
      const res = await fetch("/api/admin/instructor-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructor_email: instructor.email,
          registration_id: regId,
          kind, city: city || null, scheduled_date: date || null,
          start_time: startTime || null,
          location_name: locationName || null,
          location_url: locationUrl || null,
        }),
      });
      if (res.ok) ok++; else fail++;
    }
    setSaving(false);
    onDone(`✓ ${ok} alumno${ok !== 1 ? "s" : ""} asignado${ok !== 1 ? "s" : ""} a ${instructor.first_name}${fail > 0 ? ` · ${fail} fallidos` : ""}`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-100 bg-[#003366] rounded-t-lg flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Asignar alumnos · {instructor.first_name} {instructor.last_name}</h3>
          <button onClick={onClose} className="text-blue-200 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Curso *</label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
                <option value="">Seleccionar…</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}{c.code ? ` (${c.code})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select value={kind} onChange={(e) => setKind(e.target.value as any)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
                <option value="practical">Práctico</option>
                <option value="theoretical">Teórico</option>
                <option value="both">Teórico + Práctico</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ciudad</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hora inicio</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Lugar de la práctica</label>
              <input type="text" placeholder="Ej: Aeródromo Eulogio Sánchez" value={locationName} onChange={(e) => setLocationName(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Link de Google Maps</label>
              <input type="url" placeholder="https://maps.app.goo.gl/..." value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
            </div>
          </div>

          {courseId && (
            <div className="border border-gray-200 rounded">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-gray-50 text-xs border-b border-gray-200">
                <span>Alumnos ({visible.length} de {students.length})</span>
                <div className="flex gap-2 items-center">
                  <input type="text" placeholder="Buscar…" value={term} onChange={(e) => setTerm(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-48" />
                  <button onClick={() => setPicked(new Set(visible.map((s: any) => s.id)))} className="text-[#0072CE] hover:underline">Todos</button>
                  <button onClick={() => setPicked(new Set())} className="text-gray-500 hover:underline">Ninguno</button>
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {students.length === 0 ? (
                  <p className="p-3 text-xs text-gray-400">Sin alumnos en este curso.</p>
                ) : visible.map((s: any) => (
                  <label key={s.id} className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 last:border-0 hover:bg-blue-50 cursor-pointer ${picked.has(s.id) ? "bg-blue-50" : ""}`}>
                    <input type="checkbox" checked={picked.has(s.id)}
                      onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })} />
                    <span className="text-xs flex-1 min-w-0">
                      <span className="block font-medium text-[#003366]">{s.last_name}, {s.first_name}</span>
                      <span className="block text-gray-500">{s.email}{s.organization ? ` · ${s.organization}` : ""}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded disabled:opacity-50">Cancelar</button>
          <button onClick={save} disabled={saving || picked.size === 0}
            className="text-sm bg-[#0072CE] hover:bg-[#005fa3] text-white font-semibold px-5 py-2 rounded disabled:opacity-50">
            {saving ? "Asignando…" : `Asignar${picked.size > 0 ? ` (${picked.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ventana: nuevo honorario ─────────────────────────────────────────────────
function NewFeeModal({ instructor, assignments, onClose, onDone }: {
  instructor: Instructor;
  assignments: StudentAssignment[];
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [pickedAsg, setPickedAsg] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const asgLabel = (a: StudentAssignment) =>
    a.registrations ? `${a.registrations.last_name}, ${a.registrations.first_name}` : a.registration_id;

  function toggleAsg(id: string) {
    setPickedAsg((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function save() {
    const n = Number(amount);
    if (!n || n <= 0) { setError("Ingresa un monto válido"); return; }
    setSaving(true); setError("");
    const seleccionadas = assignments.filter((a) => pickedAsg.has(a.id));
    // Un solo honorario por el total; si es un único alumno queda asociado a él,
    // si son varios se listan en las notas (un solo registro, no uno por alumno).
    const single = seleccionadas.length === 1 ? seleccionadas[0] : null;
    const autoNota = seleccionadas.length > 1
      ? `Incluye ${seleccionadas.length} alumnos: ${seleccionadas.map(asgLabel).join("; ")}`
      : "";
    const res = await fetch("/api/admin/instructor-fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instructor_email: instructor.email,
        amount: n,
        assignment_id: single?.id || null,
        registration_id: single?.registration_id || null,
        assignment_ids: seleccionadas.map((a) => a.id),
        notes: [notes, autoNota].filter(Boolean).join(" · ") || null,
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Error al crear"); return; }
    onDone(`✓ Honorario de ${CLP.format(n)} propuesto a ${instructor.first_name}${seleccionadas.length > 0 ? ` (${seleccionadas.length} alumno${seleccionadas.length > 1 ? "s" : ""})` : ""} — se le notificó por correo.`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-100 bg-[#003366] rounded-t-lg flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Nuevo honorario · {instructor.first_name} {instructor.last_name}</h3>
          <button onClick={onClose} className="text-blue-200 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Monto (CLP) *</label>
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="150000" className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Alumnos incluidos (opcional — marca varios si el día cubre más de uno)
            </label>
            {assignments.length === 0 ? (
              <p className="text-xs text-gray-400">Este instructor no tiene alumnos asignados.</p>
            ) : (
              <div className="border border-gray-200 rounded max-h-40 overflow-y-auto divide-y divide-gray-50">
                {assignments.map((a) => (
                  <label key={a.id} className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-50 ${pickedAsg.has(a.id) ? "bg-blue-50" : ""}`}>
                    <input type="checkbox" checked={pickedAsg.has(a.id)} onChange={() => toggleAsg(a.id)} className="rounded" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-[#003366]">{asgLabel(a)}</span>
                      <span className="block text-gray-500">{KIND_LABEL[a.kind] || a.kind}{a.scheduled_date ? ` · ${a.scheduled_date}` : ""}{a.city ? ` · ${a.city}` : ""}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {pickedAsg.size > 1 && (
              <p className="text-[11px] text-gray-500 mt-1">Se creará <strong>un solo honorario</strong> por el monto total, con los {pickedAsg.size} alumnos detallados en las notas.</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Ej: clase práctica 21/07, Santiago" className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
          </div>
          <p className="text-[11px] text-gray-400">
            Se crea como "Propuesto" y se notifica al instructor por correo. El pago se registra luego en Honorarios.
          </p>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded disabled:opacity-50">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="text-sm bg-[#0072CE] hover:bg-[#005fa3] text-white font-semibold px-5 py-2 rounded disabled:opacity-50">
            {saving ? "Guardando…" : "Proponer honorario"}
          </button>
        </div>
      </div>
    </div>
  );
}
