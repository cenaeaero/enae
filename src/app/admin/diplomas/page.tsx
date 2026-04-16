"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { downloadDiplomaPDF, generateDiplomaPDF, getDiplomaPDFBase64 } from "@/lib/diploma-pdf";

type Diploma = {
  id: string;
  verification_code: string;
  student_name: string;
  course_title: string;
  course_code: string | null;
  final_score: number | null;
  status: string;
  issued_date: string;
  theoretical_start: string | null;
  practical_end: string | null;
};

type ApprovedStudent = {
  registrationId: string;
  name: string;
  email: string;
  courseTitle: string;
  courseCode: string | null;
  courseArea: string;
  finalScore: number | null;
  theoreticalStart: string | null;
  practicalEnd: string | null;
  hasDiploma: boolean;
  progressPercent: number;
  totalActivities: number;
  completedActivities: number;
  canIssueDiploma: boolean;
};

export default function AdminDiplomasPage() {
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [approved, setApproved] = useState<ApprovedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [tab, setTab] = useState<"diplomas" | "pending">("diplomas");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // Load existing diplomas
    const { data: diplomaData } = await supabase
      .from("diplomas")
      .select("*")
      .order("created_at", { ascending: false });

    if (diplomaData) setDiplomas(diplomaData as Diploma[]);

    // Load approved students (status completed OR grade_status approved)
    const { data: regs } = await supabase
      .from("registrations")
      .select(
        "id, first_name, last_name, email, final_score, grade_status, status, course_id, theoretical_start, practical_end, courses(title, code, area)"
      )
      .or("grade_status.eq.approved,status.eq.completed");

    if (regs && regs.length > 0) {
      const diplomaRegIds = (diplomaData || []).map((d: any) => d.registration_id);
      const regIds = regs.map((r: any) => r.id);
      const courseIds = Array.from(new Set(regs.map((r: any) => r.course_id).filter(Boolean)));

      // Count total activities per course
      const activitiesPerCourse: Record<string, number> = {};
      if (courseIds.length > 0) {
        const { data: modules } = await supabase
          .from("course_modules")
          .select("id, course_id")
          .in("course_id", courseIds);

        const modulesByCourseId: Record<string, string[]> = {};
        (modules || []).forEach((m: any) => {
          if (!modulesByCourseId[m.course_id]) modulesByCourseId[m.course_id] = [];
          modulesByCourseId[m.course_id].push(m.id);
        });

        const allModuleIds = (modules || []).map((m: any) => m.id);
        if (allModuleIds.length > 0) {
          const { data: activities } = await supabase
            .from("module_activities")
            .select("id, module_id")
            .in("module_id", allModuleIds);

          const activitiesByModule: Record<string, number> = {};
          (activities || []).forEach((a: any) => {
            activitiesByModule[a.module_id] = (activitiesByModule[a.module_id] || 0) + 1;
          });

          for (const [courseId, modIds] of Object.entries(modulesByCourseId)) {
            activitiesPerCourse[courseId] = modIds.reduce(
              (sum, mid) => sum + (activitiesByModule[mid] || 0),
              0
            );
          }
        }
      }

      // Count completed activities per registration
      const { data: allProgress } = await supabase
        .from("activity_progress")
        .select("registration_id, status")
        .in("registration_id", regIds)
        .eq("status", "completed");

      const completedByReg: Record<string, number> = {};
      (allProgress || []).forEach((p: any) => {
        completedByReg[p.registration_id] = (completedByReg[p.registration_id] || 0) + 1;
      });

      setApproved(
        regs.map((r: any) => {
          const totalActivities = r.course_id ? activitiesPerCourse[r.course_id] || 0 : 0;
          const completedActivities = completedByReg[r.id] || 0;
          const progressPercent = totalActivities > 0
            ? Math.round((completedActivities / totalActivities) * 100)
            : 0;

          // Diploma can be issued only if:
          // 1. Student has completed 100% of activities (or course has no activities yet — legacy)
          // 2. Grade is approved (final_score >= 80)
          const has100Progress = totalActivities === 0 || progressPercent === 100;
          const gradeOk = r.grade_status === "approved" || (r.final_score !== null && r.final_score >= 80);
          const canIssueDiploma = has100Progress && gradeOk;

          return {
            registrationId: r.id,
            name: `${r.first_name} ${r.last_name}`,
            email: r.email,
            courseTitle: r.courses?.title || "",
            courseCode: r.courses?.code || null,
            courseArea: r.courses?.area || "",
            finalScore: r.final_score,
            theoreticalStart: r.theoretical_start,
            practicalEnd: r.practical_end,
            hasDiploma: diplomaRegIds.includes(r.id),
            progressPercent,
            totalActivities,
            completedActivities,
            canIssueDiploma,
          };
        })
      );
    }
    setLoading(false);
  }

  function generateVerificationCode(
    courseCode: string | null,
    area: string
  ): string {
    // Use course code format: ENAE/UAS/001 → UAS-001-0104650-2025
    let prefix = "";
    if (courseCode) {
      // "ENAE/UAS/001" → "UAS-001"
      const parts = courseCode.split("/");
      if (parts.length >= 3) {
        prefix = `${parts[1]}-${parts[2]}`;
      } else {
        prefix = parts.join("-");
      }
    } else {
      prefix = area.replace(/[^A-Z]/gi, "").substring(0, 6).toUpperCase();
    }
    const number = String(Math.floor(Math.random() * 9000000) + 1000000).padStart(7, "0");
    const year = new Date().getFullYear();
    return `${prefix}-${number}-${year}`;
  }

  async function issueDiploma(student: ApprovedStudent) {
    // Block diploma issuance if student hasn't completed the course
    if (!student.canIssueDiploma) {
      alert(
        `No se puede emitir el diploma.\n\n` +
        `Progreso actual: ${student.progressPercent}% (${student.completedActivities}/${student.totalActivities} actividades)\n` +
        `Nota final: ${student.finalScore !== null ? student.finalScore + "%" : "sin calificar"}\n\n` +
        `El alumno debe completar el 100% del curso y tener nota aprobatoria (>= 80%) para emitir el diploma.`
      );
      return;
    }

    setIssuing(student.registrationId);

    const code = generateVerificationCode(
      student.courseCode,
      student.courseArea
    );

    const { error } = await supabase.from("diplomas").insert({
      registration_id: student.registrationId,
      verification_code: code,
      student_name: student.name,
      course_title: student.courseTitle,
      course_code: student.courseCode,
      final_score: student.finalScore,
      status: "approved",
      issued_date: new Date().toISOString().split("T")[0],
      theoretical_start: student.theoreticalStart,
      practical_end: student.practicalEnd,
    });

    if (error) {
      console.error("Error emitting diploma:", error.message);
      alert("Error al emitir diploma: " + error.message);
    } else {
      await loadData();
    }
    setIssuing(null);
  }

  async function handleView(d: Diploma) {
    try {
      const doc = await generateDiplomaPDF(d);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Revoke URL after 1 minute
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      alert("Error al generar el diploma: " + err.message);
    }
  }

  async function handleDownload(d: Diploma) {
    try {
      await downloadDiplomaPDF(d, d.course_code);
    } catch (err: any) {
      alert("Error al descargar el diploma: " + err.message);
    }
  }

  async function handleSendEmail(d: Diploma) {
    if (!confirm(`¿Enviar el diploma por email al alumno ${d.student_name}?`)) return;

    setSending(d.id);
    try {
      const pdf_base64 = await getDiplomaPDFBase64(d);
      const res = await fetch("/api/admin/enviar-diploma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diploma_id: d.id, pdf_base64 }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert(`Diploma enviado exitosamente a ${json.email}`);
      } else {
        alert("Error al enviar: " + (json.error || "Error desconocido"));
      }
    } catch (err: any) {
      alert("Error al enviar el diploma: " + err.message);
    }
    setSending(null);
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const pendingStudents = approved.filter((s) => !s.hasDiploma);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003366] mb-6">Diplomas</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("diplomas")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "diplomas"
              ? "bg-[#003366] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Diplomas Emitidos ({diplomas.length})
        </button>
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "pending"
              ? "bg-[#003366] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Pendientes de Emisión ({pendingStudents.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : tab === "diplomas" ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {diplomas.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No hay diplomas emitidos
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Alumno</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Curso</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Nota</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {diplomas.map((d) => (
                  <tr
                    key={d.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[#0072CE]">
                      {d.verification_code}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {d.student_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {d.course_title}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {d.final_score !== null ? `${d.final_score}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(d.issued_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800">
                        Emitido
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(d)}
                          className="inline-flex items-center gap-1 text-xs text-[#0072CE] hover:text-[#003366] hover:bg-blue-50 px-2 py-1 rounded transition"
                          title="Ver diploma"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver
                        </button>
                        <button
                          onClick={() => handleDownload(d)}
                          className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded transition"
                          title="Descargar PDF"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Descargar
                        </button>
                        <button
                          onClick={() => handleSendEmail(d)}
                          disabled={sending === d.id}
                          className="inline-flex items-center gap-1 text-xs text-[#F57C00] hover:text-[#E65100] hover:bg-orange-50 px-2 py-1 rounded transition disabled:opacity-50"
                          title="Enviar por email"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {sending === d.id ? "Enviando..." : "Enviar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {pendingStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No hay alumnos aprobados pendientes de diploma
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3 font-medium">Alumno</th>
                  <th className="px-4 py-3 font-medium">Curso</th>
                  <th className="px-4 py-3 font-medium">Avance</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Nota Final</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendingStudents.map((s) => (
                  <tr
                    key={s.registrationId}
                    className={`border-t border-gray-100 hover:bg-gray-50 ${!s.canIssueDiploma ? "opacity-80" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.courseTitle}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              s.progressPercent === 100 ? "bg-green-500" : s.progressPercent > 0 ? "bg-[#F57C00]" : "bg-gray-300"
                            }`}
                            style={{ width: `${s.progressPercent}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium w-10 text-right ${
                          s.progressPercent === 100 ? "text-green-600" : s.progressPercent > 0 ? "text-[#F57C00]" : "text-gray-400"
                        }`}>
                          {s.progressPercent}%
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {s.completedActivities}/{s.totalActivities} actividades
                      </p>
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600 hidden sm:table-cell">
                      {s.finalScore !== null ? `${s.finalScore}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => issueDiploma(s)}
                        disabled={issuing === s.registrationId || !s.canIssueDiploma}
                        title={!s.canIssueDiploma ? "El alumno debe completar el 100% del curso con nota >= 80%" : ""}
                        className="text-xs bg-[#003366] hover:bg-[#004B87] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded font-medium transition"
                      >
                        {issuing === s.registrationId
                          ? "Emitiendo..."
                          : "Emitir Diploma"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
