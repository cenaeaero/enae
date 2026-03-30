"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getQuestionnaireConfig,
  LIKERT_OPTIONS,
  type QuestionnaireType,
  type LikertValue,
} from "@/data/survey-questions";

type SurveyRow = {
  id: string;
  registration_id: string;
  questionnaire_type: string;
  module_name: string | null;
  answers: Record<string, string>;
  created_at: string;
  registration_name?: string;
  registration_email?: string;
  course_title?: string;
  course_code?: string;
};

const LIKERT_SCORES: Record<string, number> = {
  muy_de_acuerdo: 5,
  de_acuerdo: 4,
  neutral: 3,
  desacuerdo: 2,
  muy_en_desacuerdo: 1,
};

const typeLabels: Record<string, string> = {
  module: "Módulo",
  course: "Curso Integral",
  instructor: "Instructor",
};

export default function AdminEncuestasPage() {
  const [responses, setResponses] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<QuestionnaireType>("course");
  const [selectedResponse, setSelectedResponse] = useState<SurveyRow | null>(
    null
  );

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("survey_responses")
        .select(
          `
          id,
          registration_id,
          questionnaire_type,
          module_name,
          answers,
          created_at,
          registrations (first_name, last_name, email, courses (title, code))
        `
        )
        .order("created_at", { ascending: false });

      if (!error && data) {
        setResponses(
          data.map((r: any) => ({
            id: r.id,
            registration_id: r.registration_id,
            questionnaire_type: r.questionnaire_type,
            module_name: r.module_name,
            answers: r.answers,
            created_at: r.created_at,
            registration_name: `${r.registrations?.first_name || ""} ${r.registrations?.last_name || ""}`.trim(),
            registration_email: r.registrations?.email,
            course_title: r.registrations?.courses?.title,
            course_code: r.registrations?.courses?.code,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  const filteredResponses = responses.filter(
    (r) => r.questionnaire_type === selectedType
  );

  // Calculate averages per question
  function calculateAverages() {
    const config = getQuestionnaireConfig(selectedType);
    const likertQuestions = config.questions.filter((q) => q.type === "likert");

    return likertQuestions.map((question) => {
      const values = filteredResponses
        .map((r) => r.answers[question.id])
        .filter((v) => v && v !== "na")
        .map((v) => LIKERT_SCORES[v] || 0);

      const avg =
        values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;

      return {
        question,
        average: avg,
        count: values.length,
      };
    });
  }

  // Get all text comments
  function getComments() {
    const config = getQuestionnaireConfig(selectedType);
    const textQuestions = config.questions.filter((q) => q.type === "text");

    return filteredResponses
      .flatMap((r) =>
        textQuestions
          .filter((q) => r.answers[q.id] && r.answers[q.id].trim())
          .map((q) => ({
            question: q.text,
            answer: r.answers[q.id],
            respondent: r.registration_name,
            course: r.course_title,
            date: r.created_at,
          }))
      )
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getScoreColor(score: number) {
    if (score >= 4.5) return "text-green-600";
    if (score >= 3.5) return "text-blue-600";
    if (score >= 2.5) return "text-yellow-600";
    return "text-red-600";
  }

  const averages = calculateAverages();
  const comments = getComments();

  // General average
  const generalAvg =
    averages.length > 0
      ? averages.filter((a) => a.count > 0).reduce((sum, a) => sum + a.average, 0) /
        (averages.filter((a) => a.count > 0).length || 1)
      : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003366] mb-6">
        Resultados de Encuestas
      </h1>

      {/* Type filter */}
      <div className="flex gap-2 mb-6">
        {(["course", "instructor", "module"] as QuestionnaireType[]).map(
          (type) => {
            const count = responses.filter(
              (r) => r.questionnaire_type === type
            ).length;
            return (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  setSelectedResponse(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedType === type
                    ? "bg-[#003366] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {typeLabels[type]} ({count})
              </button>
            );
          }
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : filteredResponses.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-400">
            No hay respuestas de tipo &quot;{typeLabels[selectedType]}&quot; aún
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Total Respuestas
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {filteredResponses.length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Promedio General
              </p>
              <p className={`text-2xl font-bold ${getScoreColor(generalAvg)}`}>
                {generalAvg.toFixed(2)} / 5.00
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Comentarios
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {comments.length}
              </p>
            </div>
          </div>

          {/* Averages per question */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                Promedios por Pregunta
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="px-5 py-3 font-medium">Sección</th>
                  <th className="px-5 py-3 font-medium">Pregunta</th>
                  <th className="px-5 py-3 font-medium text-center">
                    Promedio
                  </th>
                  <th className="px-5 py-3 font-medium text-center">
                    Respuestas
                  </th>
                </tr>
              </thead>
              <tbody>
                {averages.map(({ question, average, count }) => (
                  <tr
                    key={question.id}
                    className="border-t border-gray-50 hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {question.sectionLabel}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{question.text}</td>
                    <td className="px-5 py-3 text-center">
                      {count > 0 ? (
                        <span
                          className={`font-semibold ${getScoreColor(average)}`}
                        >
                          {average.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-500">
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Comments */}
          {comments.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Comentarios</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {comments.map((comment, idx) => (
                  <div key={idx} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-700">
                          &quot;{comment.answer}&quot;
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {comment.question}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-gray-600">
                          {comment.respondent}
                        </p>
                        <p className="text-xs text-gray-400">
                          {comment.course}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(comment.date)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual responses list */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                Respuestas Individuales
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="px-5 py-3 font-medium">Alumno</th>
                  <th className="px-5 py-3 font-medium hidden md:table-cell">
                    Curso
                  </th>
                  {selectedType === "module" && (
                    <th className="px-5 py-3 font-medium">Módulo</th>
                  )}
                  <th className="px-5 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setSelectedResponse(
                        selectedResponse?.id === r.id ? null : r
                      )
                    }
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">
                        {r.registration_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {r.registration_email}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-gray-600 hidden md:table-cell">
                      {r.course_title}
                    </td>
                    {selectedType === "module" && (
                      <td className="px-5 py-3 text-gray-600">
                        {r.module_name || "—"}
                      </td>
                    )}
                    <td className="px-5 py-3 text-gray-500">
                      {formatDate(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded individual response */}
          {selectedResponse && (
            <div className="mt-4 bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">
                  Respuesta de {selectedResponse.registration_name}
                </h3>
                <button
                  onClick={() => setSelectedResponse(null)}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Cerrar
                </button>
              </div>
              <div className="space-y-3">
                {getQuestionnaireConfig(selectedType).questions.map((q) => {
                  const answer = selectedResponse.answers[q.id];
                  if (!answer) return null;
                  const likertLabel = LIKERT_OPTIONS.find(
                    (o) => o.value === answer
                  )?.label;
                  return (
                    <div key={q.id} className="flex gap-4 text-sm">
                      <p className="text-gray-500 w-1/2">{q.text}</p>
                      <p className="text-gray-800 font-medium">
                        {likertLabel || answer}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
