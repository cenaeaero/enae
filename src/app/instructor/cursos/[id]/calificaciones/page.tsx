"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type GradeItem = { id: string; name: string; weight: number; sort_order: number; is_practical: boolean };
type Student = {
  registrationId: string;
  name: string;
  email: string;
  organization: string | null;
  grades: Record<string, number | null>;
  originalGrades: Record<string, number | null>;
};

export default function InstructorCalificacionesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const router = useRouter();
  const [courseTitle, setCourseTitle] = useState("");
  const [gradeItems, setGradeItems] = useState<GradeItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        router.replace("/instructor/login");
        return;
      }

      const res = await fetch(`/api/instructor/calificaciones?course_id=${courseId}`);
      if (res.status === 403) {
        setError("No tienes permiso para ver este curso.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Error al cargar");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setCourseTitle(data.course?.title || "");
      setGradeItems(data.grade_items || []);
      setStudents(
        (data.students || []).map((s: any) => ({
          ...s,
          originalGrades: { ...s.grades },
        }))
      );
      setLoading(false);
    })();
  }, [courseId, router]);

  function setGrade(regId: string, itemId: string, value: string) {
    const score = value === "" ? null : Math.max(0, Math.min(100, Number(value)));
    setStudents((prev) =>
      prev.map((s) => (s.registrationId === regId ? { ...s, grades: { ...s.grades, [itemId]: score } } : s))
    );
  }

  async function save() {
    setSaving(true);
    setMessage("");

    const practicalItems = gradeItems.filter((g) => g.is_practical);
    const toSave: any[] = [];

    for (const student of students) {
      for (const item of practicalItems) {
        const newScore = student.grades[item.id];
        const oldScore = student.originalGrades[item.id];
        if (newScore !== oldScore && newScore !== null && newScore !== undefined) {
          toSave.push({
            registration_id: student.registrationId,
            grade_item_id: item.id,
            score: newScore,
          });
        }
      }
    }

    if (toSave.length === 0) {
      setMessage("No hay cambios para guardar.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/instructor/calificaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, grades: toSave }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(`Error: ${data.error || "No se pudo guardar"}`);
      setSaving(false);
      return;
    }

    setMessage(`Guardado correctamente. Se notificó a ${data.notified || 0} alumno(s).`);
    // Refresh originals
    setStudents((prev) =>
      prev.map((s) => ({ ...s, originalGrades: { ...s.grades } }))
    );
    setSaving(false);
  }

  if (loading) return <div className="text-gray-400">Cargando...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">{error}</div>;

  const practicalItems = gradeItems.filter((g) => g.is_practical);
  const readonlyItems = gradeItems.filter((g) => !g.is_practical);

  return (
    <div>
      <div className="mb-6">
        <Link href="/instructor" className="text-sm text-[#0072CE] hover:underline">← Mis cursos</Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">{courseTitle}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Puedes editar las notas marcadas como <strong>Práctica</strong>. Las otras están en solo lectura.
          Al guardar, se enviará un email al alumno notificándole la nueva nota.
        </p>
      </div>

      {practicalItems.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm mb-6">
          Este curso no tiene grade_items marcados como <code>is_practical</code>. Pide al administrador que marque el Módulo 9 (o el correspondiente) como evaluación práctica.
        </div>
      )}

      {students.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          No hay alumnos matriculados en este curso.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50">Alumno</th>
                {readonlyItems.map((g) => (
                  <th key={g.id} className="text-center px-3 py-3 font-medium text-gray-500 text-xs">
                    {g.name}
                    <div className="text-[10px] font-normal text-gray-400 mt-0.5">Solo lectura</div>
                  </th>
                ))}
                {practicalItems.map((g) => (
                  <th key={g.id} className="text-center px-3 py-3 font-medium text-emerald-700 text-xs bg-emerald-50">
                    {g.name}
                    <div className="text-[10px] font-normal text-emerald-600 mt-0.5">Editable</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.registrationId} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 sticky left-0 bg-white">
                    <div className="font-medium text-gray-800">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.email}</div>
                    {s.organization && <div className="text-xs text-gray-400">{s.organization}</div>}
                  </td>
                  {readonlyItems.map((g) => {
                    const score = s.grades[g.id];
                    return (
                      <td key={g.id} className="text-center px-3 py-3 text-gray-500">
                        {score != null ? `${score}` : "—"}
                      </td>
                    );
                  })}
                  {practicalItems.map((g) => (
                    <td key={g.id} className="text-center px-3 py-3 bg-emerald-50/30">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={s.grades[g.id] ?? ""}
                        onChange={(e) => setGrade(s.registrationId, g.id, e.target.value)}
                        className="w-20 border border-gray-200 rounded px-2 py-1 text-center focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        placeholder="—"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {practicalItems.length > 0 && students.length > 0 && (
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="bg-[#003366] hover:bg-[#004B87] disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium"
          >
            {saving ? "Guardando..." : "Guardar Calificaciones"}
          </button>
          {message && (
            <span className={`text-sm ${message.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>
              {message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
