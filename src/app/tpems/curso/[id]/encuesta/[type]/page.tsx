"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getQuestionnaireConfig,
  LIKERT_OPTIONS,
  type QuestionnaireType,
  type SurveyQuestion,
} from "@/data/survey-questions";

export default function SurveyFormPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const registrationId = params.id as string;
  const questionnaireType = params.type as QuestionnaireType;
  const moduleName = searchParams.get("module") || "";

  const [courseTitle, setCourseTitle] = useState("");
  const [courseDates, setCourseDates] = useState("");
  const [courseLocation, setCourseLocation] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const config = getQuestionnaireConfig(questionnaireType);
  const sections = config.sections;

  useEffect(() => {
    setActiveSection(sections[0]);
  }, []);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("registrations")
        .select(
          `
          id,
          courses (title, code),
          sessions (dates, location)
        `
        )
        .eq("id", registrationId)
        .single();

      if (data) {
        const r = data as any;
        setCourseTitle(r.courses?.title || "");
        setCourseDates(r.sessions?.dates || "");
        setCourseLocation(r.sessions?.location || "");
      }
      setLoading(false);
    }
    load();
  }, [registrationId]);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    // Validate required questions
    const requiredQuestions = config.questions.filter((q) => q.required);
    const missing = requiredQuestions.filter((q) => !answers[q.id]);
    if (missing.length > 0) {
      setError(
        `Por favor responde todas las preguntas obligatorias (${missing.length} pendientes)`
      );
      // Navigate to the section of the first missing answer
      const firstMissing = missing[0];
      setActiveSection(firstMissing.section);
      return;
    }

    setSubmitting(true);
    setError("");

    const res = await fetch("/api/encuesta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        registrationId,
        questionnaireType,
        moduleName: questionnaireType === "module" ? moduleName : null,
        answers,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Error al enviar la encuesta");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">Cargando...</div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <svg
            className="w-16 h-16 text-green-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Encuesta enviada exitosamente
          </h2>
          <p className="text-gray-500 mb-6">
            Gracias por completar el cuestionario. Tu retroalimentación es muy
            valiosa.
          </p>
          <button
            onClick={() => router.push(`/tpems/curso/${registrationId}`)}
            className="bg-[#0072CE] hover:bg-[#005BA1] text-white px-6 py-2 rounded-lg text-sm font-medium transition"
          >
            Volver al curso
          </button>
        </div>
      </div>
    );
  }

  const sectionQuestions = config.questions.filter(
    (q) => q.section === activeSection
  );
  const currentSectionIndex = sections.indexOf(activeSection);

  // Build display title
  let displayTitle = config.titlePrefix;
  if (questionnaireType === "module" && moduleName) {
    displayTitle += ` ${moduleName}`;
  }

  return (
    <>
      {/* Header */}
      <div className="bg-[#4FC3F7] text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-6 h-6 text-white/70"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span className="font-semibold text-sm">ENAE TPEMS</span>
            </div>
            <span className="text-white/50 text-sm">|</span>
            <span className="text-sm font-medium uppercase tracking-wide">
              {displayTitle}
            </span>
          </div>
          <p className="text-white/70 text-xs mt-1">
            {courseTitle}, from {courseDates} in {courseLocation}
          </p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex border-b border-gray-200 mt-4">
          {sections.map((sectionKey) => (
            <button
              key={sectionKey}
              onClick={() => setActiveSection(sectionKey)}
              className={`px-4 py-3 text-sm font-medium transition whitespace-nowrap ${
                activeSection === sectionKey
                  ? "text-[#F57C00] border-b-2 border-[#F57C00]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {config.sectionLabels[sectionKey]}
            </button>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg border border-gray-200">
          {sectionQuestions.map((question, idx) => (
            <QuestionRow
              key={question.id}
              question={question}
              index={
                config.questions
                  .filter((q) => q.type === question.type || true)
                  .indexOf(question) + 1
              }
              value={answers[question.id] || ""}
              onChange={(val) => setAnswer(question.id, val)}
              isLast={idx === sectionQuestions.length - 1}
            />
          ))}
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => {
              if (currentSectionIndex > 0) {
                setActiveSection(sections[currentSectionIndex - 1]);
              } else {
                router.push(`/tpems/curso/${registrationId}`);
              }
            }}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {currentSectionIndex > 0 ? "Sección anterior" : "Volver"}
          </button>

          {currentSectionIndex < sections.length - 1 ? (
            <button
              onClick={() =>
                setActiveSection(sections[currentSectionIndex + 1])
              }
              className="flex items-center gap-2 bg-[#0072CE] hover:bg-[#005BA1] text-white px-5 py-2 rounded-lg text-sm font-medium transition"
            >
              Siguiente sección
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
            >
              {submitting ? "Enviando..." : "Enviar Encuesta"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================
// Question Row Component
// ============================================
function QuestionRow({
  question,
  index,
  value,
  onChange,
  isLast,
}: {
  question: SurveyQuestion;
  index: number;
  value: string;
  onChange: (val: string) => void;
  isLast: boolean;
}) {
  if (question.type === "text") {
    return (
      <div className={`px-6 py-5 ${!isLast ? "border-b border-gray-100" : ""}`}>
        <label className="block text-sm text-gray-700 mb-2">
          {index}. {question.text}
          {!question.required && (
            <span className="text-gray-400 text-xs ml-2">(Opcional)</span>
          )}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0072CE]/20 focus:border-[#0072CE] resize-none"
          placeholder="Escribe tu respuesta aquí..."
        />
      </div>
    );
  }

  return (
    <div className={`px-6 py-5 ${!isLast ? "border-b border-gray-100" : ""}`}>
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <p className="text-sm text-gray-700 lg:w-1/3 shrink-0">
          {index}. {question.text}
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {LIKERT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <input
                type="radio"
                name={question.id}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="w-4 h-4 text-[#F57C00] accent-[#F57C00]"
              />
              <span className="text-xs text-gray-600">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
