"use client";

import { useState, useEffect, useCallback } from "react";

type Question = {
  id: string;
  question_type: string;
  question_text: string;
  options: { label: string; text: string }[];
  points: number;
};

type Props = {
  examId: string;
  registrationId: string;
  onComplete?: (score: number, passed: boolean) => void;
};

export default function ExamPlayer({ examId, registrationId, onComplete }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; earned_points: number; total_points: number } | null>(null);
  const [error, setError] = useState("");

  const startExam = useCallback(async () => {
    try {
      const res = await fetch("/api/examenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", exam_id: examId, registration_id: registrationId }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); setLoading(false); return; }

      setAttemptId(json.attempt_id);
      setQuestions(json.questions || []);
      if (json.time_limit_minutes) {
        setTimeLimit(json.time_limit_minutes);
        setTimeLeft(json.time_limit_minutes * 60);
      }
      setLoading(false);
    } catch {
      setError("Error al iniciar el examen");
      setLoading(false);
    }
  }, [examId, registrationId]);

  useEffect(() => { startExam(); }, [startExam]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, result]);

  async function submitExam() {
    if (!attemptId) return;
    setSubmitting(true);
    try {
      const answerList = Object.entries(answers).map(([question_id, selected_answer]) => ({
        question_id,
        selected_answer,
      }));

      const res = await fetch("/api/examenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", attempt_id: attemptId, answers: answerList }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); } else {
        setResult(json);
        onComplete?.(json.score, json.passed);
      }
    } catch {
      setError("Error al enviar examen");
    }
    setSubmitting(false);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Cargando examen...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>;

  // Show result
  if (result) {
    return (
      <div className={`rounded-lg border p-6 text-center ${result.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <div className="text-4xl mb-3">{result.passed ? "✅" : "❌"}</div>
        <h3 className={`text-xl font-bold mb-2 ${result.passed ? "text-green-800" : "text-red-800"}`}>
          {result.passed ? "Aprobado" : "Reprobado"}
        </h3>
        <p className="text-2xl font-bold text-gray-800 mb-1">{result.score}%</p>
        <p className="text-sm text-gray-500">{result.earned_points} / {result.total_points} puntos</p>
      </div>
    );
  }

  return (
    <div>
      {/* Timer */}
      {timeLeft !== null && (
        <div className={`sticky top-0 z-10 bg-white border-b px-4 py-2 flex items-center justify-between ${timeLeft < 60 ? "text-red-600" : "text-gray-600"}`}>
          <span className="text-sm font-medium">Tiempo restante</span>
          <span className="text-lg font-mono font-bold">{formatTime(timeLeft)}</span>
        </div>
      )}

      {/* Progress */}
      <div className="mb-4 text-xs text-gray-400">
        {Object.keys(answers).length} / {questions.length} respondidas
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-sm font-medium text-gray-800 mb-3">
              <span className="text-gray-400 mr-2">{idx + 1}.</span>
              {q.question_text}
            </p>
            <div className="space-y-2">
              {q.options.map((opt) => (
                <label key={opt.label} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  answers[q.id] === opt.label
                    ? "border-[#0072CE] bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === opt.label}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.label }))}
                    className="text-[#0072CE]"
                  />
                  <span className="text-xs font-medium text-gray-400 w-5">{opt.label}.</span>
                  <span className="text-sm text-gray-700">{opt.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={submitExam}
        disabled={submitting}
        className="mt-6 w-full bg-[#0072CE] hover:bg-[#005fa3] text-white py-3 rounded-lg text-sm font-medium transition disabled:opacity-50"
      >
        {submitting ? "Enviando..." : "Finalizar Examen"}
      </button>
    </div>
  );
}
