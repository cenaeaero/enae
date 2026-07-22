"use client";

import { useEffect, useMemo, useState } from "react";

// Centro de Informes del supervisor — estilo Microsoft Dynamics:
// menú lateral de informes + área de trabajo con barra de comandos, filtros,
// tabla y exportación (Excel/CSV e impresión a PDF).

type Student = {
  id: string; name: string; first_name: string; last_name: string; email: string;
  rut: string | null; folio: string | null; organization: string | null;
  course: string | null; course_code: string | null; course_area: string | null;
  modality: string | null; duration: string | null; session: string | null; location: string | null;
  status: string; final_score: number | null; grade_status: string | null;
  created_at: string; completed_at: string | null; last_access: string | null;
  modules_total: number; modules_done: number; progress: number;
  diploma: { verification_code: string; final_score: number | null; status: string; issued_date: string | null } | null;
  has_dgac_certificate: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", confirmed: "En curso", completed: "Completado",
  rejected: "Rechazado", cancelled: "Cancelado",
};

type ReportKey = "listado" | "avance" | "curso" | "fecha" | "individual" | "certificados" | "mensajes";

const REPORTS: { key: ReportKey; icon: string; label: string; desc: string }[] = [
  { key: "listado", icon: "📋", label: "Listado de alumnos", desc: "Nómina completa con datos de contacto y estado" },
  { key: "avance", icon: "📈", label: "Estado de avance", desc: "Progreso por módulos, notas y último acceso" },
  { key: "curso", icon: "📚", label: "Informe por curso", desc: "Resumen agrupado por programa" },
  { key: "fecha", icon: "📅", label: "Informe por fecha", desc: "Filtrado por período de inscripción o término" },
  { key: "individual", icon: "👤", label: "Informe individual", desc: "Ficha completa de un alumno" },
  { key: "certificados", icon: "🏅", label: "Certificados y diplomas", desc: "Documentos emitidos y códigos de verificación" },
  { key: "mensajes", icon: "✉️", label: "Mensajes al administrador", desc: "Solicitudes y consultas a ENAE" },
];

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("es-CL") : "—");
const fmtDateTime = (d: string | null) => (d ? new Date(d).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }) : "—");

export default function SupervisorInformesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportKey>("listado");
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fCourse, setFCourse] = useState("all");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [campoFecha, setCampoFecha] = useState<"created_at" | "completed_at">("created_at");
  const [selStudent, setSelStudent] = useState("");
  const [asCompany, setAsCompany] = useState<string | null>(null);

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("as_company");
    setAsCompany(c);
    (async () => {
      const res = await fetch(`/api/supervisor/informes${c ? `?as_company=${c}` : ""}`).then((r) => r.json());
      setStudents(res.students || []);
      setCompanies(res.companies || []);
      setLoading(false);
    })();
  }, []);

  const cursos = useMemo(
    () => Array.from(new Set(students.map((s) => s.course).filter(Boolean))) as string[],
    [students]);

  // Filtro común
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return students.filter((s) => {
      if (fStatus !== "all" && s.status !== fStatus) return false;
      if (fCourse !== "all" && s.course !== fCourse) return false;
      if (report === "fecha") {
        const v = s[campoFecha];
        if (desde && (!v || v.slice(0, 10) < desde)) return false;
        if (hasta && (!v || v.slice(0, 10) > hasta)) return false;
      }
      if (!t) return true;
      return [s.name, s.email, s.rut, s.folio, s.course, s.organization]
        .some((v) => (v || "").toLowerCase().includes(t));
    });
  }, [students, q, fStatus, fCourse, report, campoFecha, desde, hasta]);

  // ── Exportación ──
  function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
    const esc = (v: string | number | null) => {
      const s = v == null ? "" : String(v);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = "﻿" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const hoy = new Date().toISOString().slice(0, 10);

  function exportar() {
    if (report === "avance") {
      downloadCsv(`estado_avance_${hoy}.csv`,
        ["Alumno", "Email", "Curso", "Avance (%)", "Módulos", "Nota final", "Estado", "Último acceso"],
        filtered.map((s) => [s.name, s.email, s.course, s.progress, `${s.modules_done}/${s.modules_total}`,
          s.final_score ?? "", STATUS_LABEL[s.status] || s.status, fmtDateTime(s.last_access)]));
    } else if (report === "certificados") {
      downloadCsv(`certificados_${hoy}.csv`,
        ["Alumno", "RUT", "Folio ENAE", "Curso", "Diploma", "Código verificación", "Nota", "Emitido"],
        filtered.map((s) => [s.name, s.rut, s.folio, s.course,
          s.diploma ? "Emitido" : "Pendiente", s.diploma?.verification_code ?? "",
          s.diploma?.final_score ?? s.final_score ?? "", fmtDate(s.diploma?.issued_date ?? null)]));
    } else if (report === "curso") {
      downloadCsv(`informe_por_curso_${hoy}.csv`,
        ["Curso", "Código", "Alumnos", "En curso", "Completados", "Promedio nota", "Avance promedio (%)"],
        porCurso.map((c) => [c.curso, c.codigo, c.total, c.enCurso, c.completados,
          c.promedio != null ? c.promedio : "", c.avance]));
    } else {
      downloadCsv(`listado_alumnos_${hoy}.csv`,
        ["Alumno", "RUT", "Folio ENAE", "Email", "Empresa", "Curso", "Código", "Modalidad", "Estado", "Nota final", "Inscrito", "Completado"],
        filtered.map((s) => [s.name, s.rut, s.folio, s.email, s.organization, s.course, s.course_code,
          s.modality, STATUS_LABEL[s.status] || s.status, s.final_score ?? "", fmtDate(s.created_at), fmtDate(s.completed_at)]));
    }
  }

  const porCurso = useMemo(() => {
    const m: Record<string, { curso: string; codigo: string; total: number; enCurso: number; completados: number; notas: number[]; avances: number[] }> = {};
    for (const s of filtered) {
      const k = s.course || "Sin curso";
      if (!m[k]) m[k] = { curso: k, codigo: s.course_code || "", total: 0, enCurso: 0, completados: 0, notas: [], avances: [] };
      m[k].total++;
      if (s.status === "confirmed") m[k].enCurso++;
      if (s.status === "completed") m[k].completados++;
      if (s.final_score != null) m[k].notas.push(Number(s.final_score));
      m[k].avances.push(s.progress);
    }
    return Object.values(m).map((c) => ({
      ...c,
      promedio: c.notas.length ? Math.round(c.notas.reduce((a, b) => a + b, 0) / c.notas.length) : null,
      avance: c.avances.length ? Math.round(c.avances.reduce((a, b) => a + b, 0) / c.avances.length) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const actual = REPORTS.find((r) => r.key === report)!;
  const suffix = asCompany ? `?as_company=${asCompany}` : "";

  // El diploma se arma en el cliente (mismo generador que usa el admin)
  async function bajarDiploma(s: Student) {
    if (!s.diploma) return;
    const { downloadDiplomaPDF } = await import("@/lib/diploma-pdf");
    await downloadDiplomaPDF({
      verification_code: s.diploma.verification_code,
      student_name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.name,
      course_title: s.course || "",
      course_code: s.course_code,
      final_score: s.diploma.final_score ?? s.final_score,
      status: s.diploma.status,
      issued_date: s.diploma.issued_date || s.completed_at || new Date().toISOString(),
    }, s.course_code);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-100px)]">
      <style>{`@media print { .no-print { display: none !important; } aside { display: none !important; } main { padding: 0 !important; } body { background: #fff; } }`}</style>

      {/* ── Menú lateral de informes ── */}
      <nav className="no-print w-full lg:w-72 shrink-0 bg-white border border-gray-200 rounded-lg overflow-hidden lg:h-full lg:overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-100 bg-[#003366]">
          <h2 className="text-sm font-bold text-white">📊 Centro de Informes</h2>
          <p className="text-[11px] text-blue-200 mt-0.5">{companies.map((c) => c.name).join(" · ") || "Tus empresas"}</p>
        </div>
        <div className="divide-y divide-gray-50">
          {REPORTS.map((r) => (
            <button key={r.key} onClick={() => setReport(r.key)}
              className={`w-full text-left px-4 py-3 transition flex gap-3 ${report === r.key ? "bg-blue-50 border-l-4 border-[#0072CE]" : "hover:bg-gray-50 border-l-4 border-transparent"}`}>
              <span className="text-base shrink-0">{r.icon}</span>
              <span className="min-w-0">
                <span className={`block text-sm font-medium ${report === r.key ? "text-[#0072CE]" : "text-gray-800"}`}>{r.label}</span>
                <span className="block text-[11px] text-gray-400 leading-snug">{r.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── Área de trabajo ── */}
      <main className="flex-1 min-w-0 lg:h-full lg:overflow-y-auto space-y-4">
        {/* Barra de comandos */}
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400">Informes <span className="mx-1">›</span> <span className="text-gray-700 font-medium">{actual.label}</span></p>
            <h1 className="text-lg font-bold text-[#003366]">{actual.icon} {actual.label}</h1>
          </div>
          <span className="flex-1" />
          {report !== "mensajes" && report !== "individual" && (
            <>
              <span className="text-xs text-gray-500">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
              <button onClick={exportar} className="no-print text-sm bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium px-4 py-2 rounded">
                ⬇️ Excel (CSV)
              </button>
              <button onClick={() => window.print()} className="no-print text-sm bg-[#003366] hover:bg-[#00254d] text-white font-medium px-4 py-2 rounded">
                🖨️ Imprimir / PDF
              </button>
            </>
          )}
        </div>

        {/* Filtros */}
        {report !== "mensajes" && (
          <div className="no-print bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] text-gray-500 mb-1">Buscar</label>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Nombre, RUT, folio, email, curso…"
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Estado</label>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white">
                <option value="all">Todos</option>
                <option value="confirmed">En curso</option>
                <option value="completed">Completados</option>
                <option value="pending">Pendientes</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Curso</label>
              <select value={fCourse} onChange={(e) => setFCourse(e.target.value)} className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white max-w-[220px]">
                <option value="all">Todos</option>
                {cursos.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {report === "fecha" && (
              <>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Período por</label>
                  <select value={campoFecha} onChange={(e) => setCampoFecha(e.target.value as any)} className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white">
                    <option value="created_at">Inscripción</option>
                    <option value="completed_at">Término</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Desde</label>
                  <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="border border-gray-200 rounded px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Hasta</label>
                  <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="border border-gray-200 rounded px-3 py-1.5 text-sm" />
                </div>
              </>
            )}
            {(q || fStatus !== "all" || fCourse !== "all" || desde || hasta) && (
              <button onClick={() => { setQ(""); setFStatus("all"); setFCourse("all"); setDesde(""); setHasta(""); }}
                className="text-xs text-gray-500 hover:underline pb-1.5">Limpiar filtros</button>
            )}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">Cargando informes…</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* ── Listado / Por fecha ── */}
            {(report === "listado" || report === "fecha") && (
              <Tabla headers={["Alumno", "RUT", "Folio", "Curso", "Modalidad", "Estado", "Nota", report === "fecha" && campoFecha === "completed_at" ? "Completado" : "Inscrito"]}>
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <Td><span className="font-medium text-[#003366]">{s.name}</span><span className="block text-[11px] text-gray-400">{s.email}</span></Td>
                    <Td>{s.rut || "—"}</Td>
                    <Td>{s.folio || "—"}</Td>
                    <Td>{s.course || "—"}</Td>
                    <Td>{s.modality || "—"}</Td>
                    <Td><Estado status={s.status} /></Td>
                    <Td>{s.final_score != null ? `${s.final_score}%` : "—"}</Td>
                    <Td>{fmtDate(report === "fecha" && campoFecha === "completed_at" ? s.completed_at : s.created_at)}</Td>
                  </tr>
                ))}
              </Tabla>
            )}

            {/* ── Estado de avance ── */}
            {report === "avance" && (
              <Tabla headers={["Alumno", "Curso", "Avance", "Módulos", "Nota final", "Estado", "Último acceso"]}>
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <Td><span className="font-medium text-[#003366]">{s.name}</span><span className="block text-[11px] text-gray-400">{s.email}</span></Td>
                    <Td>{s.course || "—"}</Td>
                    <Td>
                      <div className="flex items-center gap-2 min-w-[110px]">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.progress >= 100 ? "bg-green-500" : "bg-[#0072CE]"}`} style={{ width: `${s.progress}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-500 w-8">{s.progress}%</span>
                      </div>
                    </Td>
                    <Td>{s.modules_total > 0 ? `${s.modules_done}/${s.modules_total}` : "—"}</Td>
                    <Td>{s.final_score != null ? `${s.final_score}%` : "—"}</Td>
                    <Td><Estado status={s.status} /></Td>
                    <Td>{fmtDateTime(s.last_access)}</Td>
                  </tr>
                ))}
              </Tabla>
            )}

            {/* ── Por curso ── */}
            {report === "curso" && (
              <Tabla headers={["Curso", "Código", "Alumnos", "En curso", "Completados", "Promedio nota", "Avance promedio"]}>
                {porCurso.map((c) => (
                  <tr key={c.curso} className="hover:bg-gray-50">
                    <Td><span className="font-medium text-[#003366]">{c.curso}</span></Td>
                    <Td><span className="font-mono text-[11px] text-gray-500">{c.codigo || "—"}</span></Td>
                    <Td><strong>{c.total}</strong></Td>
                    <Td><span className="text-[#0072CE]">{c.enCurso}</span></Td>
                    <Td><span className="text-green-700">{c.completados}</span></Td>
                    <Td>{c.promedio != null ? `${c.promedio}%` : "—"}</Td>
                    <Td>
                      <div className="flex items-center gap-2 min-w-[110px]">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${c.avance}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-500 w-8">{c.avance}%</span>
                      </div>
                    </Td>
                  </tr>
                ))}
              </Tabla>
            )}

            {/* ── Certificados ── */}
            {report === "certificados" && (
              <Tabla headers={["Alumno", "RUT", "Folio", "Curso", "Diploma", "Código verificación", "Emitido", ""]}>
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <Td><span className="font-medium text-[#003366]">{s.name}</span></Td>
                    <Td>{s.rut || "—"}</Td>
                    <Td>{s.folio || "—"}</Td>
                    <Td>{s.course || "—"}</Td>
                    <Td>
                      {s.diploma ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ Emitido</span>
                        : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Pendiente</span>}
                    </Td>
                    <Td><span className="font-mono text-[11px]">{s.diploma?.verification_code || "—"}</span></Td>
                    <Td>{fmtDate(s.diploma?.issued_date || null)}</Td>
                    <Td>
                      {s.diploma && (
                        <button onClick={() => bajarDiploma(s)} className="no-print text-xs text-[#0072CE] hover:underline whitespace-nowrap">⬇️ Diploma</button>
                      )}
                      {s.has_dgac_certificate && s.status === "completed" && (
                        <a href={`/api/certificado-dgac?registration_id=${s.id}`} className="no-print block text-xs text-purple-600 hover:underline whitespace-nowrap">⬇️ Cert. DGAC</a>
                      )}
                    </Td>
                  </tr>
                ))}
              </Tabla>
            )}

            {/* ── Individual ── */}
            {report === "individual" && (
              <div className="p-5">
                <label className="block text-[11px] text-gray-500 mb-1">Selecciona un alumno</label>
                <select value={selStudent} onChange={(e) => setSelStudent(e.target.value)}
                  className="border border-gray-200 rounded px-3 py-2 text-sm bg-white w-full max-w-md mb-5">
                  <option value="">Seleccionar…</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.course}</option>)}
                </select>
                {(() => {
                  const s = students.find((x) => x.id === selStudent);
                  if (!s) return <p className="text-sm text-gray-400">Elige un alumno para ver su informe completo.</p>;
                  return (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 pb-4">
                        <span className="w-14 h-14 rounded-full bg-[#003366] text-white flex items-center justify-center text-lg font-bold">
                          {(s.first_name?.[0] || "") + (s.last_name?.[0] || "")}
                        </span>
                        <div>
                          <h3 className="text-lg font-bold text-[#003366]">{s.first_name} {s.last_name}</h3>
                          <p className="text-sm text-gray-500">{s.email}{s.rut ? ` · ${s.rut}` : ""}{s.folio ? ` · Folio ${s.folio}` : ""}</p>
                        </div>
                        <span className="flex-1" />
                        <a href={`/supervisor/alumno/${s.id}${suffix}`} className="no-print text-xs text-[#0072CE] hover:underline">Ver ficha completa →</a>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <KPI label="Avance" value={`${s.progress}%`} />
                        <KPI label="Nota final" value={s.final_score != null ? `${s.final_score}%` : "—"} />
                        <KPI label="Módulos" value={s.modules_total > 0 ? `${s.modules_done}/${s.modules_total}` : "—"} />
                        <KPI label="Estado" value={STATUS_LABEL[s.status] || s.status} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <Dato label="Curso" value={`${s.course || "—"}${s.course_code ? ` (${s.course_code})` : ""}`} />
                        <Dato label="Modalidad" value={s.modality} />
                        <Dato label="Duración" value={s.duration} />
                        <Dato label="Sesión" value={s.session} />
                        <Dato label="Empresa" value={s.organization} />
                        <Dato label="Inscrito" value={fmtDate(s.created_at)} />
                        <Dato label="Completado" value={fmtDate(s.completed_at)} />
                        <Dato label="Último acceso" value={fmtDateTime(s.last_access)} />
                        <Dato label="Diploma" value={s.diploma ? `Emitido · ${s.diploma.verification_code}` : "Pendiente"} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── Mensajes al admin ── */}
            {report === "mensajes" && <MensajeAdmin students={students} />}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Componentes auxiliares ──
function Tabla({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  const rows = Array.isArray(children) ? children : [children];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-gray-500 uppercase border-b border-gray-100 bg-gray-50">
            {headers.map((h, i) => <th key={i} className="px-4 py-2 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">{children}</tbody>
      </table>
      {rows.flat().length === 0 && <p className="p-8 text-center text-sm text-gray-400">Sin registros para los filtros seleccionados.</p>}
    </div>
  );
}
const Td = ({ children }: { children: React.ReactNode }) => <td className="px-4 py-2.5 text-gray-700 align-top">{children}</td>;
const KPI = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
    <p className="text-lg font-bold text-[#003366]">{value}</p>
    <p className="text-[11px] text-gray-500">{label}</p>
  </div>
);
const Dato = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex gap-2">
    <span className="text-gray-400 text-xs w-28 shrink-0">{label}</span>
    <span className="text-gray-800">{value || "—"}</span>
  </div>
);
function Estado({ status }: { status: string }) {
  const cls = status === "completed" ? "bg-green-100 text-green-700"
    : status === "confirmed" ? "bg-blue-100 text-blue-700"
    : status === "cancelled" || status === "rejected" ? "bg-gray-100 text-gray-500"
    : "bg-amber-100 text-amber-700";
  return <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${cls}`}>{STATUS_LABEL[status] || status}</span>;
}

function MensajeAdmin({ students }: { students: Student[] }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [about, setAbout] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  async function send() {
    if (!body.trim()) { setMsg("Error: escribe el mensaje"); return; }
    setSending(true); setMsg("");
    // El alumno elegido se indica en el texto: about_profile_id espera un id de
    // profiles y aquí manejamos ids de inscripción, que no son equivalentes.
    const alumno = students.find((s) => s.id === about);
    const texto = alumno ? `Sobre el alumno: ${alumno.name} (${alumno.email})\n\n${body}` : body;
    const res = await fetch("/api/supervisor/mensaje", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject || null, body: texto }),
    });
    setSending(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setMsg(`Error: ${d.error || "no se pudo enviar"}`); return; }
    setSubject(""); setBody(""); setAbout("");
    setMsg("✓ Mensaje enviado a la administración de ENAE. Te responderán a tu correo.");
  }

  return (
    <div className="p-5 max-w-2xl">
      <h3 className="font-semibold text-[#003366] mb-1">Enviar mensaje a la administración</h3>
      <p className="text-xs text-gray-500 mb-4">Solicitudes de nuevos cupos, certificados, cambios de fecha, informes especiales o cualquier consulta sobre tus alumnos.</p>
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Asunto</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej: Solicitud de certificados para 3 alumnos"
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Sobre un alumno (opcional)</label>
          <select value={about} onChange={(e) => setAbout(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-white">
            <option value="">— Consulta general —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Mensaje *</label>
          <textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
        </div>
        {msg && <p className={`text-sm ${msg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>{msg}</p>}
        <div className="flex justify-end">
          <button onClick={send} disabled={sending}
            className="bg-[#0072CE] hover:bg-[#005fa3] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded">
            {sending ? "Enviando…" : "✉️ Enviar mensaje"}
          </button>
        </div>
      </div>
    </div>
  );
}
