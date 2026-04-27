"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CourseOption = { id: string; title: string; code: string | null };
type GradeItem = { id: string; name: string; weight: number; sort_order: number; is_auto?: boolean };
type StudentRow = {
  registrationId: string;
  name: string;
  email: string;
  company: string | null;
  grades: Record<string, number | null>; // grade_item_id -> score
  autoGrades: Set<string>; // grade_item_ids that were auto-graded
  finalScore: number | null;
  gradeStatus: string | null;
};

export default function CalificacionesPage() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [gradeItems, setGradeItems] = useState<GradeItem[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const searchNorm = search.trim().toLowerCase();
  const filteredStudents = searchNorm
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchNorm) ||
          s.email.toLowerCase().includes(searchNorm) ||
          (s.company ?? "").toLowerCase().includes(searchNorm)
      )
    : students;

  useEffect(() => {
    let cancelled = false;

    async function loadCourses(attempt = 1) {
      // Wait for the Supabase session to be hydrated before querying.
      // Fire-and-forget without this sometimes runs before cookies are ready
      // → RLS returns empty and the dropdown never populates.
      await supabase.auth.getSession();

      const { data, error } = await supabase
        .from("courses")
        .select("id, title, code")
        .eq("is_active", true)
        .order("title");

      if (cancelled) return;

      if (error) {
        console.warn("[calificaciones] error loading courses:", error.message);
        if (attempt < 3) {
          setTimeout(() => loadCourses(attempt + 1), 500 * attempt);
        }
        return;
      }

      if (!data || data.length === 0) {
        // No rows — retry up to 3 times in case session was still hydrating
        if (attempt < 3) {
          setTimeout(() => loadCourses(attempt + 1), 500 * attempt);
          return;
        }
      }

      setCourses((data as CourseOption[]) || []);
    }

    loadCourses();

    // Also reload when auth state changes (e.g. session just got hydrated)
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadCourses();
      }
    });

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
    };
  }, []);

  async function loadGrades(courseId: string) {
    setLoading(true);
    setMessage("");

    // Load grade items
    const { data: items } = await supabase
      .from("grade_items")
      .select("*")
      .eq("course_id", courseId)
      .order("sort_order");

    // Mark module-based items as auto-graded
    const gradeItemsList = ((items as GradeItem[]) || []).map((item) => ({
      ...item,
      is_auto: item.name.toLowerCase().includes("modulo") || item.name.toLowerCase().includes("módulo") || item.name.toLowerCase().includes("dgac") || item.name.toLowerCase().includes("simulador"),
    }));
    setGradeItems(gradeItemsList);

    // Load registrations for this course
    const { data: regs } = await supabase
      .from("registrations")
      .select("id, first_name, last_name, email, organization, status")
      .eq("course_id", courseId)
      .in("status", ["confirmed", "completed"])
      .order("last_name");

    if (!regs || regs.length === 0 || !items) {
      setStudents([]);
      setLoading(false);
      return;
    }

    // Load existing grades from student_grades
    const regIds = regs.map((r: any) => r.id);
    const { data: grades } = await supabase
      .from("student_grades")
      .select("registration_id, grade_item_id, score, comments")
      .in("registration_id", regIds);

    const gradeMap: Record<string, Record<string, number | null>> = {};
    const autoGradeMap: Record<string, Set<string>> = {};
    (grades || []).forEach((g: any) => {
      if (!gradeMap[g.registration_id]) gradeMap[g.registration_id] = {};
      if (!autoGradeMap[g.registration_id]) autoGradeMap[g.registration_id] = new Set();
      gradeMap[g.registration_id][g.grade_item_id] = g.score;
      if (g.comments?.includes("Auto-calificado")) {
        autoGradeMap[g.registration_id].add(g.grade_item_id);
      }
    });

    // Also load latest exam attempt scores per module for students who have taken exams
    // This catches scores that weren't saved to student_grades yet
    const { data: examAttempts } = await supabase
      .from("exam_attempts")
      .select("registration_id, score, status, exams(activity_id, grade_item_id)")
      .in("registration_id", regIds)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    if (examAttempts) {
      for (const attempt of examAttempts as any[]) {
        const regId = attempt.registration_id;
        const exam = attempt.exams;
        if (!exam?.grade_item_id) continue;
        if (!gradeMap[regId]) gradeMap[regId] = {};
        if (!autoGradeMap[regId]) autoGradeMap[regId] = new Set();
        // Only set if not already set (keep latest)
        if (gradeMap[regId][exam.grade_item_id] === undefined || gradeMap[regId][exam.grade_item_id] === null) {
          gradeMap[regId][exam.grade_item_id] = attempt.score;
          autoGradeMap[regId].add(exam.grade_item_id);
        }
      }
    }

    setStudents(
      regs.map((r: any) => ({
        registrationId: r.id,
        name: `${r.first_name} ${r.last_name}`,
        email: r.email,
        company: r.organization || null,
        grades: gradeMap[r.id] || {},
        autoGrades: autoGradeMap[r.id] || new Set(),
        finalScore: null,
        gradeStatus: "pending",
      }))
    );

    setLoading(false);
  }

  function setGrade(regId: string, itemId: string, score: number | null) {
    setStudents((prev) =>
      prev.map((s) =>
        s.registrationId === regId
          ? { ...s, grades: { ...s.grades, [itemId]: score } }
          : s
      )
    );
  }

  function calculateFinal(grades: Record<string, number | null>): number | null {
    if (gradeItems.length === 0) return null;
    let totalWeight = 0;
    let weightedSum = 0;
    let hasGrades = false;

    for (const item of gradeItems) {
      const score = grades[item.id];
      if (score !== null && score !== undefined) {
        weightedSum += score * item.weight;
        totalWeight += item.weight;
        hasGrades = true;
      }
    }

    return hasGrades && totalWeight > 0
      ? Math.round((weightedSum / totalWeight) * 100) / 100
      : null;
  }

  async function saveAll() {
    setSaving(true);
    setMessage("");

    // Load exams linked to grade_items (to auto-mark activity as completed)
    const gradeItemIds = gradeItems.map((g) => g.id);
    const { data: linkedExams } = await supabase
      .from("exams")
      .select("activity_id, grade_item_id")
      .in("grade_item_id", gradeItemIds);
    const examsByGradeItem: Record<string, string> = {};
    (linkedExams || []).forEach((e: any) => {
      if (e.grade_item_id && e.activity_id) {
        examsByGradeItem[e.grade_item_id] = e.activity_id;
      }
    });

    // Build bulk arrays in one pass (no awaits inside)
    const gradeRows: { registration_id: string; grade_item_id: string; score: number }[] = [];
    const activityProgressRows: { registration_id: string; activity_id: string; status: string; started_at: string; completed_at: string }[] = [];
    const regUpdates: { registrationId: string; final_score: number | null; grade_status: string }[] = [];
    const now = new Date().toISOString();

    for (const student of students) {
      for (const item of gradeItems) {
        const score = student.grades[item.id];
        if (score !== null && score !== undefined) {
          gradeRows.push({
            registration_id: student.registrationId,
            grade_item_id: item.id,
            score,
          });
          const activityId = examsByGradeItem[item.id];
          if (activityId) {
            activityProgressRows.push({
              registration_id: student.registrationId,
              activity_id: activityId,
              status: "completed",
              started_at: now,
              completed_at: now,
            });
          }
        }
      }

      const finalScore = calculateFinal(student.grades);
      const gradeStatus =
        finalScore !== null ? (finalScore >= 80 ? "approved" : "failed") : "pending";
      regUpdates.push({
        registrationId: student.registrationId,
        final_score: finalScore,
        grade_status: gradeStatus,
      });
      student.finalScore = finalScore;
      student.gradeStatus = gradeStatus;
    }

    try {
      // 1. Bulk upsert all grades in a single call
      if (gradeRows.length > 0) {
        await supabase
          .from("student_grades")
          .upsert(gradeRows, { onConflict: "registration_id,grade_item_id" });
      }

      // 2. Bulk upsert all activity_progress rows in a single call
      if (activityProgressRows.length > 0) {
        await supabase
          .from("activity_progress")
          .upsert(activityProgressRows, { onConflict: "registration_id,activity_id" });
      }

      // 3. Update registrations final_score in parallel
      await Promise.all(
        regUpdates.map((u) =>
          supabase
            .from("registrations")
            .update({ final_score: u.final_score, grade_status: u.grade_status })
            .eq("id", u.registrationId)
        )
      );

      // 4. Single auto-calificar call for the course (cascades module completion + diploma)
      await fetch("/api/admin/auto-calificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: selectedCourse }),
      });
    } catch (err: any) {
      console.error("Error saving grades:", err?.message);
      setMessage("Error guardando: " + (err?.message || "desconocido"));
      setSaving(false);
      return;
    }

    setStudents([...students]);
    setMessage("Calificaciones guardadas correctamente");
    setSaving(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003366] mb-6">
        Libro de Calificaciones
      </h1>

      {/* Course selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs text-gray-500 uppercase mb-1">
              Seleccionar Curso
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSearch("");
                if (e.target.value) loadGrades(e.target.value);
              }}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} {c.code ? `(${c.code})` : ""}
                </option>
              ))}
            </select>
          </div>
          {selectedCourse && students.length > 0 && (
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs text-gray-500 uppercase mb-1">
                Buscar Alumno
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre, email o empresa..."
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#0072CE]"
              />
            </div>
          )}
          {selectedCourse && students.length > 0 && (
            <button
              onClick={saveAll}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
            >
              {saving ? "Guardando..." : "Guardar Calificaciones"}
            </button>
          )}
        </div>
        {selectedCourse && students.length > 0 && searchNorm && (
          <p className="text-xs text-gray-500 mt-2">
            Mostrando {filteredStudents.length} de {students.length} alumnos
          </p>
        )}
      </div>

      {message && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : selectedCourse && gradeItems.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            No hay evaluaciones definidas para este curso.
          </p>
          <a
            href={`/admin/cursos/${selectedCourse}/evaluaciones`}
            className="text-[#0072CE] hover:underline text-sm mt-2 inline-block"
          >
            Definir evaluaciones
          </a>
        </div>
      ) : selectedCourse && students.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            No hay alumnos inscritos en este curso.
          </p>
        </div>
      ) : selectedCourse ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 font-medium sticky left-0 bg-gray-50 z-10">
                  Alumno
                </th>
                {gradeItems.map((item) => (
                  <th
                    key={item.id}
                    className="px-3 py-3 font-medium text-center whitespace-nowrap"
                  >
                    <span className="block">{item.name}</span>
                    <span className="block text-[10px] text-gray-400 font-normal">
                      Peso: {item.weight}%
                    </span>
                    {item.is_auto && (
                      <span className="inline-block mt-0.5 text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                        Auto
                      </span>
                    )}
                  </th>
                ))}
                <th className="px-3 py-3 font-medium text-center">Final</th>
                <th className="px-3 py-3 font-medium text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={gradeItems.length + 3}
                    className="px-4 py-8 text-center text-gray-400 text-sm"
                  >
                    No se encontraron alumnos que coincidan con &ldquo;{search}&rdquo;
                  </td>
                </tr>
              ) : null}
              {filteredStudents.map((student) => {
                const final_ = calculateFinal(student.grades);
                const status =
                  final_ !== null
                    ? final_ >= 80
                      ? "approved"
                      : "failed"
                    : "pending";
                return (
                  <tr
                    key={student.registrationId}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 sticky left-0 bg-white z-10">
                      <p className="font-medium text-gray-800">
                        {student.name}
                      </p>
                      <p className="text-xs text-gray-400">{student.email}</p>
                    </td>
                    {gradeItems.map((item) => {
                      const isAuto = student.autoGrades.has(item.id);
                      const score = student.grades[item.id];
                      return (
                        <td key={item.id} className="px-3 py-3 text-center">
                          {isAuto ? (
                            <span className={`font-bold text-sm ${
                              score !== null && score !== undefined
                                ? score >= 80 ? "text-green-600" : "text-red-600"
                                : "text-gray-400"
                            }`}>
                              {score !== null && score !== undefined ? `${score}%` : "—"}
                            </span>
                          ) : (
                            <input
                              type="number"
                              value={score ?? ""}
                              onChange={(e) =>
                                setGrade(
                                  student.registrationId,
                                  item.id,
                                  e.target.value === ""
                                    ? null
                                    : parseFloat(e.target.value)
                                )
                              }
                              min="0"
                              max="100"
                              className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-center focus:ring-1 focus:ring-[#0072CE]"
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`font-bold ${
                          final_ === null
                            ? "text-gray-400"
                            : final_ >= 80
                              ? "text-green-600"
                              : "text-red-600"
                        }`}
                      >
                        {final_ !== null ? `${final_}%` : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          status === "approved"
                            ? "bg-green-100 text-green-800"
                            : status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {status === "approved"
                          ? "Aprobado"
                          : status === "failed"
                            ? "Reprobado"
                            : "Pendiente"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
