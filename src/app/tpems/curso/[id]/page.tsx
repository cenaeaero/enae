"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type CourseDelivery = {
  id: string;
  status: string;
  course_title: string;
  course_code: string;
  course_duration: string;
  course_description: string;
  course_modules: string[];
  session_dates: string;
  session_location: string;
  session_modality: string;
};

type SurveyResponse = {
  id: string;
  questionnaire_type: string;
  module_name: string | null;
  created_at: string;
};

type Tab = "info" | "evaluation" | "discussions";

export default function TpemsCourseDetail() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("registrations")
        .select(
          `
          id,
          status,
          courses (title, code, duration, description, modules),
          sessions (dates, location, modality)
        `
        )
        .eq("id", params.id)
        .single();

      if (!error && data) {
        const r = data as any;
        setCourse({
          id: r.id,
          status: r.status,
          course_title: r.courses?.title || "",
          course_code: r.courses?.code || "",
          course_duration: r.courses?.duration || "",
          course_description: r.courses?.description || "",
          course_modules: r.courses?.modules || [],
          session_dates: r.sessions?.dates || "",
          session_location: r.sessions?.location || "",
          session_modality: r.sessions?.modality || "",
        });

        // Load survey responses for this registration
        if (r.status === "completed") {
          const { data: responses } = await supabase
            .from("survey_responses")
            .select("id, questionnaire_type, module_name, created_at")
            .eq("registration_id", r.id);

          if (responses) {
            setSurveyResponses(responses);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">Cargando...</div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg text-gray-500">Curso no encontrado</h2>
        <Link
          href="/tpems"
          className="text-[#0072CE] hover:underline text-sm mt-2 inline-block"
        >
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "evaluation", label: "Evaluation" },
    { key: "discussions", label: "Discussions (0)" },
  ];

  // Build questionnaire list for Evaluation tab
  function buildQuestionnaireList() {
    const items: {
      name: string;
      type: string;
      moduleName?: string;
      completed: boolean;
      dateCompleted?: string;
    }[] = [];

    // One questionnaire per module
    if (course!.course_modules && course!.course_modules.length > 0) {
      course!.course_modules.forEach((mod) => {
        const response = surveyResponses.find(
          (r) => r.questionnaire_type === "module" && r.module_name === mod
        );
        items.push({
          name: `Cuestionario de opinión sobre el módulo - ${mod}`,
          type: "module",
          moduleName: mod,
          completed: !!response,
          dateCompleted: response?.created_at,
        });
      });
    }

    // Course integral questionnaire
    const courseResponse = surveyResponses.find(
      (r) => r.questionnaire_type === "course"
    );
    items.push({
      name: "Cuestionario integral del curso",
      type: "course",
      completed: !!courseResponse,
      dateCompleted: courseResponse?.created_at,
    });

    // Instructor evaluation questionnaire
    const instructorResponse = surveyResponses.find(
      (r) => r.questionnaire_type === "instructor"
    );
    items.push({
      name: "Cuestionario de evaluación del instructor",
      type: "instructor",
      completed: !!instructorResponse,
      dateCompleted: instructorResponse?.created_at,
    });

    return items;
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <>
      {/* Course header */}
      <div className="bg-[#4FC3F7] text-white">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/tpems")}
              className="w-10 h-10 rounded-full border-2 border-white/40 flex items-center justify-center hover:bg-white/10 transition shrink-0"
            >
              <svg
                className="w-5 h-5"
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
            </button>
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                <svg
                  className="w-8 h-8 text-white/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight">
                  {course.course_title}
                </h1>
                <p className="text-white/70 text-sm mt-0.5">
                  {course.course_code}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session info */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-1">
          <span className="text-xl font-light text-gray-800">
            {course.session_dates}
          </span>
          <span className="text-gray-400 ml-4">{course.session_location}</span>
        </div>
        <p className="text-sm text-gray-400">
          Escuela de Navegación Aérea (ENAE)
        </p>

        {/* Tabs */}
        <div className="flex gap-0 mt-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "text-gray-800 border-b-2 border-[#F57C00]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === "info" && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Course thumbnail */}
                <div className="sm:w-40 shrink-0">
                  <div className="bg-gradient-to-br from-[#003366] to-[#004B87] rounded-lg aspect-[3/4] flex items-center justify-center">
                    <div className="text-center text-white p-4">
                      <svg
                        className="w-10 h-10 mx-auto mb-2 opacity-60"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                      <p className="text-xs text-white/60">ENAE</p>
                    </div>
                  </div>
                </div>

                {/* Course details */}
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-gray-800 mb-1">
                    {course.course_title}
                  </h2>
                  <p className="text-sm text-gray-400 mb-4">
                    {course.course_code}
                  </p>

                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium text-gray-700">
                        Duration:
                      </span>{" "}
                      <span className="text-gray-600">
                        {course.course_duration}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">
                        Modality:
                      </span>{" "}
                      <span className="text-gray-600">
                        {course.session_modality}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">
                        Instructor:
                      </span>{" "}
                      <span className="text-gray-600">Por confirmar</span>
                    </p>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-base font-medium text-gray-800 mb-2">
                      Course Material
                    </h3>
                    <p className="text-sm text-gray-400">
                      No material available at the moment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "evaluation" && (
            <>
              {course.status !== "completed" ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <svg
                    className="w-12 h-12 text-gray-300 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <p className="text-gray-500 font-medium">
                    Los cuestionarios estarán disponibles al finalizar el curso
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Una vez que el curso sea marcado como completado, podrás
                    responder las encuestas de evaluación.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-6 py-4 font-medium text-gray-500 uppercase text-xs tracking-wider">
                          Questionnaire
                        </th>
                        <th className="text-left px-6 py-4 font-medium text-gray-500 uppercase text-xs tracking-wider">
                          Status
                        </th>
                        <th className="text-left px-6 py-4 font-medium text-gray-500 uppercase text-xs tracking-wider">
                          Date Completed
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {buildQuestionnaireList().map((item, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition"
                        >
                          <td className="px-6 py-4">
                            {item.completed ? (
                              <span className="text-gray-600">
                                {item.name}
                              </span>
                            ) : (
                              <Link
                                href={`/tpems/curso/${course.id}/encuesta/${item.type}${item.moduleName ? `?module=${encodeURIComponent(item.moduleName)}` : ""}`}
                                className="text-[#0072CE] hover:underline"
                              >
                                {item.name}
                              </Link>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {item.completed ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded bg-green-100 text-green-800 border border-green-200">
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {item.dateCompleted
                              ? formatDate(item.dateCompleted)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === "discussions" && (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <p className="text-gray-500">No discussions found.</p>
              <p className="text-sm text-gray-400 mt-2">
                Discussions are closed for this session.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
