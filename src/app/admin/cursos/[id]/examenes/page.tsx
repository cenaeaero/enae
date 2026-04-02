"use client";

import { use, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

type Question = {
  id?: string;
  sort_order: number;
  question_type: string;
  question_text: string;
  options: { label: string; text: string }[];
  correct_answer: string;
  points: number;
  is_new?: boolean;
};

type Exam = {
  id: string;
  activity_id: string;
  time_limit_minutes: number | null;
  passing_score: number;
  max_attempts: number;
  shuffle_questions: boolean;
  is_final_exam: boolean;
  is_dgac_simulator: boolean;
  grade_item_id: string | null;
};

function ExamEditorContent({ courseId }: { courseId: string }) {
  const searchParams = useSearchParams();
  const activityId = searchParams.get("activity_id");

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activityId) { setLoading(false); return; }
    fetch(`/api/admin/examenes?activity_id=${activityId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.exam) setExam(json.exam);
        if (json.questions) setQuestions(json.questions);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activityId]);

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        sort_order: prev.length,
        question_type: "multiple_choice",
        question_text: "",
        options: [
          { label: "A", text: "" },
          { label: "B", text: "" },
          { label: "C", text: "" },
          { label: "D", text: "" },
        ],
        correct_answer: "A",
        points: 1,
        is_new: true,
      },
    ]);
  }

  function updateQuestion(idx: number, field: string, value: any) {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  }

  function updateOption(qIdx: number, optIdx: number, text: string) {
    const q = questions[qIdx];
    const opts = [...q.options];
    opts[optIdx] = { ...opts[optIdx], text };
    updateQuestion(qIdx, "options", opts);
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function changeQuestionType(idx: number, type: string) {
    const q = questions[idx];
    if (type === "true_false") {
      updateQuestion(idx, "question_type", type);
      updateQuestion(idx, "options", [
        { label: "V", text: "Verdadero" },
        { label: "F", text: "Falso" },
      ]);
      updateQuestion(idx, "correct_answer", "V");
    } else {
      updateQuestion(idx, "question_type", type);
      if (q.options.length < 4) {
        updateQuestion(idx, "options", [
          { label: "A", text: "" },
          { label: "B", text: "" },
          { label: "C", text: "" },
          { label: "D", text: "" },
        ]);
        updateQuestion(idx, "correct_answer", "A");
      }
    }
  }

  // CSV Import
  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      const dataLines = lines.slice(1); // Skip header

      const parsed: Question[] = dataLines.map((line, i) => {
        // Handle CSV with quoted values
        const parts: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') { inQuotes = !inQuotes; continue; }
          if (char === "," && !inQuotes) { parts.push(current.trim()); current = ""; continue; }
          current += char;
        }
        parts.push(current.trim());

        const [questionText, type, optA, optB, optC, optD, correct] = parts;
        const isTF = type?.toLowerCase() === "true_false" || type?.toLowerCase() === "verdadero_falso";

        return {
          sort_order: questions.length + i,
          question_type: isTF ? "true_false" : "multiple_choice",
          question_text: questionText || "",
          options: isTF
            ? [{ label: "V", text: "Verdadero" }, { label: "F", text: "Falso" }]
            : [
                { label: "A", text: optA || "" },
                { label: "B", text: optB || "" },
                { label: "C", text: optC || "" },
                { label: "D", text: optD || "" },
              ].filter((o) => o.text),
          correct_answer: correct?.toUpperCase() || "A",
          points: 1,
          is_new: true,
        };
      }).filter((q) => q.question_text);

      setQuestions((prev) => [...prev, ...parsed]);
      setSuccess(`${parsed.length} preguntas importadas del CSV`);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadCSVTemplate() {
    const csv = `pregunta,tipo,opcion_a,opcion_b,opcion_c,opcion_d,correcta
"Cual es la altitud maxima para UAS Categoria A1?",multiple_choice,"50m","120m","150m","200m","B"
"Los drones de menos de 250g requieren registro DGAC",true_false,"Verdadero","Falso","","","B"`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_preguntas_examen.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveExamSettings() {
    if (!exam) return;
    setSaving(true);
    try {
      await fetch("/api/admin/examenes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exam),
      });
      setSuccess("Configuracion guardada");
    } catch { setError("Error al guardar configuracion"); }
    setSaving(false);
  }

  async function saveQuestions() {
    if (!exam) return;
    setSaving(true);
    setError("");
    try {
      // Save new questions via bulk import
      const newQuestions = questions.filter((q) => q.is_new && q.question_text);
      if (newQuestions.length > 0) {
        const res = await fetch("/api/admin/examenes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "import_csv",
            exam_id: exam.id,
            questions: newQuestions.map((q) => ({
              type: q.question_type,
              text: q.question_text,
              options: q.options,
              correct: q.correct_answer,
            })),
          }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
      }

      setSuccess(`${newQuestions.length} preguntas guardadas`);
      // Reload
      const res = await fetch(`/api/admin/examenes?activity_id=${activityId}`);
      const json = await res.json();
      if (json.questions) setQuestions(json.questions);
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  async function deleteQuestion(id: string) {
    try {
      await fetch("/api/admin/examenes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_question", id }),
      });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch {}
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Cargando...</div>;
  if (!activityId) return <div className="text-center py-16 text-gray-400">No se especifico actividad</div>;

  return (
    <div>
      <Link href={`/admin/cursos/${courseId}/modulos`} className="text-sm text-[#0072CE] hover:underline mb-4 inline-block">← Volver a Modulos</Link>
      <h1 className="text-2xl font-bold text-[#003366] mb-6">Editor de Examen</h1>

      {/* Exam settings */}
      {exam && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Configuracion del Examen</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tiempo limite (min)</label>
              <input type="number" value={exam.time_limit_minutes || ""} onChange={(e) => setExam({ ...exam, time_limit_minutes: parseInt(e.target.value) || null })} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" placeholder="Sin limite" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Puntaje aprobacion (%)</label>
              <input type="number" value={exam.passing_score} onChange={(e) => setExam({ ...exam, passing_score: parseInt(e.target.value) || 80 })} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Intentos maximos</label>
              <input type="number" value={exam.max_attempts} onChange={(e) => setExam({ ...exam, max_attempts: parseInt(e.target.value) || 1 })} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={exam.shuffle_questions} onChange={(e) => setExam({ ...exam, shuffle_questions: e.target.checked })} />
                Mezclar preguntas
              </label>
            </div>
          </div>
          <div className="flex gap-4 mt-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={exam.is_final_exam} onChange={(e) => setExam({ ...exam, is_final_exam: e.target.checked })} />
              Examen Final del Curso
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={exam.is_dgac_simulator} onChange={(e) => setExam({ ...exam, is_dgac_simulator: e.target.checked })} />
              Simulador DGAC
            </label>
          </div>
          <button onClick={saveExamSettings} disabled={saving} className="mt-3 bg-[#003366] text-white px-4 py-2 rounded text-sm hover:bg-[#002244] disabled:opacity-50">
            Guardar Configuracion
          </button>
        </div>
      )}

      {/* CSV Import */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Importar Preguntas (CSV)</h2>
        <p className="text-xs text-gray-500 mb-3">Formato: pregunta, tipo (multiple_choice / true_false), opcion_a, opcion_b, opcion_c, opcion_d, correcta (A/B/C/D o V/F)</p>
        <div className="flex gap-3">
          <button onClick={downloadCSVTemplate} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded transition">Descargar Plantilla CSV</button>
          <label className="text-xs bg-[#0072CE] hover:bg-[#005fa3] text-white px-4 py-2 rounded cursor-pointer transition">
            Subir CSV
            <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4 mb-6">
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">Pregunta {qIdx + 1}</span>
              <div className="flex items-center gap-3">
                <select value={q.question_type} onChange={(e) => changeQuestionType(qIdx, e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1">
                  <option value="multiple_choice">Seleccion Multiple</option>
                  <option value="true_false">Verdadero / Falso</option>
                </select>
                <button onClick={() => q.id ? deleteQuestion(q.id) : removeQuestion(qIdx)} className="text-xs text-red-500 hover:underline">Eliminar</button>
              </div>
            </div>

            <textarea value={q.question_text} onChange={(e) => updateQuestion(qIdx, "question_text", e.target.value)} placeholder="Texto de la pregunta..." rows={2} className="w-full border border-gray-200 rounded px-3 py-2 text-sm mb-3" />

            <div className="space-y-2">
              {q.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qIdx}`}
                    checked={q.correct_answer === opt.label}
                    onChange={() => updateQuestion(qIdx, "correct_answer", opt.label)}
                    className="text-[#0072CE]"
                  />
                  <span className="text-xs font-medium text-gray-500 w-5">{opt.label}.</span>
                  <input
                    value={opt.text}
                    onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                    placeholder={`Opcion ${opt.label}`}
                    className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm"
                    disabled={q.question_type === "true_false"}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={addQuestion} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition">+ Nueva Pregunta</button>
        <button onClick={saveQuestions} disabled={saving} className="bg-[#0072CE] hover:bg-[#005fa3] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
          {saving ? "Guardando..." : "Guardar Preguntas"}
        </button>
      </div>

      {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}
    </div>
  );
}

export default function AdminExamenesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-400">Cargando...</div>}>
      <ExamEditorContent courseId={courseId} />
    </Suspense>
  );
}
