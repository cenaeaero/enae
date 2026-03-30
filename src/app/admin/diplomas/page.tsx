"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
};

export default function AdminDiplomasPage() {
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [approved, setApproved] = useState<ApprovedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<string | null>(null);
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

    // Load approved students without diplomas
    const { data: regs } = await supabase
      .from("registrations")
      .select(
        "id, first_name, last_name, email, final_score, grade_status, theoretical_start, practical_end, courses(title, code, area)"
      )
      .eq("grade_status", "approved");

    if (regs) {
      const diplomaRegIds = (diplomaData || []).map(
        (d: any) => d.registration_id
      );
      setApproved(
        regs.map((r: any) => ({
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
        }))
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

    if (!error) {
      await loadData();
    }
    setIssuing(null);
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
                  <th className="px-4 py-3 font-medium hidden md:table-cell">
                    Curso
                  </th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">
                    Nota
                  </th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
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
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">
                    Nota Final
                  </th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendingStudents.map((s) => (
                  <tr
                    key={s.registrationId}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.courseTitle}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600 hidden sm:table-cell">
                      {s.finalScore !== null ? `${s.finalScore}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => issueDiploma(s)}
                        disabled={issuing === s.registrationId}
                        className="text-xs bg-[#003366] hover:bg-[#004B87] disabled:bg-gray-300 text-white px-3 py-1.5 rounded font-medium transition"
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
