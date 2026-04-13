"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Question = {
  id: string;
  question_type: string;
  question_text: string;
  options: { label: string; text: string }[];
  points: number;
};

type ReviewItem = {
  id: string;
  question_text: string;
  question_type: string;
  options: { label: string; text: string }[];
  correct_answer: string;
  selected_answer: string | null;
  is_correct: boolean;
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
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState("");
  const [resumed, setResumed] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const answersRef = useRef(answers);
  const attemptIdRef = useRef(attemptId);
  const submittingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);

  // Auto-save answers every 30 seconds
  const saveAnswers = useCallback(async () => {
    const currentAttemptId = attemptIdRef.current;
    const currentAnswers = answersRef.current;
    if (!currentAttemptId || Object.keys(currentAnswers).length === 0 || submittingRef.current) return;
    try {
      const res = await fetch("/api/examenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_answers", attempt_id: currentAttemptId, answers: currentAnswers }),
      });
      const json = await res.json();
      if (json.saved) {
        setLastSaved(new Date().toLocaleTimeString());
      }
    } catch {
      // Silent fail — will retry next interval
    }
  }, []);

  useEffect(() => {
    if (!attemptId || result) return;
    const interval = setInterval(saveAnswers, 30000);
    return () => clearInterval(interval);
  }, [attemptId, result, saveAnswers]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentAttemptId = attemptIdRef.current;
      const currentAnswers = answersRef.current;
      if (!currentAttemptId || Object.keys(currentAnswers).length === 0) return;
      const blob = new Blob([JSON.stringify({
        action: "save_answers",
        attempt_id: currentAttemptId,
        answers: currentAnswers,
      })], { type: "application/json" });
      navigator.sendBeacon("/api/examenes", blob);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const startExam = useCallback(async () => {
    try {
      const res = await fetch("/api/examenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", exam_id: examId, registration_id: registrationId }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); setLoading(false); return; }

      // If server auto-finalized an expired attempt, show results
      if (json.score !== undefined) {
        setResult(json);
        if (json.review) setReview(json.review);
        onComplete?.(json.score, json.passed);
        setLoading(false);
        return;
      }

      setAttemptId(json.attempt_id);
      setQuestions(json.questions || []);

      // Resume: restore saved answers
      if (json.resumed && json.saved_answers) {
        setAnswers(json.saved_answers);
        setResumed(true);
      }

      if (json.remaining_seconds !== undefined && json.remaining_seconds !== null) {
        // Resumed exam with remaining time
        setTimeLimit(json.time_limit_minutes);
        setTimeLeft(json.remaining_seconds);
      } else if (json.time_limit_minutes) {
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
    if (!attemptId || submittingRef.current) return;
    submittingRef.current = true;
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
        if (json.review) setReview(json.review);
        onComplete?.(json.score, json.passed);
      }
    } catch {
      setError("Error al enviar examen");
    }
    submittingRef.current = false;
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
    const correctCount = review.filter((r) => r.is_correct).length;
    const incorrectCount = review.filter((r) => !r.is_correct).length;

    return (
      <div className="space-y-4">
        <div className={`rounded-2xl border p-6 text-center ${result.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="text-4xl mb-3">{result.passed ? "✅" : "❌"}</div>
          <h3 className={`text-xl font-bold mb-2 ${result.passed ? "text-green-800" : "text-red-800"}`}>
            {result.passed ? "Aprobado" : "Reprobado"}
          </h3>
          <p className="text-2xl font-bold text-gray-800 mb-1">{result.score}%</p>
          <p className="text-sm text-gray-500">{result.earned_points} / {result.total_points} puntos</p>
          {review.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <span className="text-green-600 font-medium">{correctCount} correctas</span>
              <span className="text-gray-300">|</span>
              <span className="text-red-600 font-medium">{incorrectCount} incorrectas</span>
            </div>
          )}
        </div>

        {review.length > 0 && (
          <div>
            <button
              onClick={() => setShowReview(!showReview)}
              className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <span>{showReview ? "Ocultar revisión" : "Ver revisión de respuestas"}</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showReview ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showReview && (
              <div className="mt-3 space-y-3">
                {review.map((item, idx) => (
                  <div key={item.id} className={`rounded-xl border p-4 ${item.is_correct ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${item.is_correct ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                        {item.is_correct ? "✓" : "✗"}
                      </div>
                      <p className="text-sm font-medium text-gray-800">
                        <span className="text-gray-400 mr-1">{idx + 1}.</span>
                        {item.question_text}
                      </p>
                    </div>
                    <div className="ml-10 space-y-1.5">
                      {item.options.map((opt) => {
                        const isCorrectOpt = opt.label === item.correct_answer;
                        const isSelected = opt.label === item.selected_answer;
                        const isWrongSelected = isSelected && !item.is_correct;
                        return (
                          <div key={opt.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                            isCorrectOpt ? "bg-green-100 border border-green-300 text-green-800 font-medium" :
                            isWrongSelected ? "bg-red-100 border border-red-300 text-red-800" :
                            "text-gray-500"
                          }`}>
                            <span className="text-xs font-medium w-5">{opt.label}.</span>
                            <span>{opt.text}</span>
                            {isCorrectOpt && <span className="ml-auto text-xs text-green-600 font-medium">Correcta</span>}
                            {isWrongSelected && <span className="ml-auto text-xs text-red-600 font-medium">Tu respuesta</span>}
                          </div>
                        );
                      })}
                      {!item.selected_answer && (
                        <p className="text-xs text-gray-400 italic ml-3">No respondida</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Timer + auto-save status */}
      {timeLeft !== null && (
        <div className={`sticky top-0 z-10 bg-white border-b px-4 py-2 flex items-center justify-between ${timeLeft < 60 ? "text-red-600" : "text-gray-600"}`}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Tiempo restante</span>
            {lastSaved && <span className="text-[10px] text-gray-400">Guardado: {lastSaved}</span>}
          </div>
          <span className="text-lg font-mono font-bold">{formatTime(timeLeft)}</span>
        </div>
      )}

      {/* Resumed notice */}
      {resumed && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm mb-4">
          Se han recuperado tus respuestas anteriores. Puedes continuar donde lo dejaste.
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
