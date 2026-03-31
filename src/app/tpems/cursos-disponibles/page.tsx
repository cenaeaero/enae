"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type AvailableCourse = {
  id: string;
  title: string;
  code: string | null;
  description: string;
  area: string;
  area_slug: string;
  level: string;
  duration: string;
  modality: string;
  image_url: string | null;
  sessions: {
    id: string;
    dates: string;
    location: string;
    modality: string;
    fee: string | null;
  }[];
};

const areaIcons: Record<string, string> = {
  "uas-rpas": "🛩️",
  "atm-navegacion": "🗼",
  "seguridad-avsec": "🛡️",
  simuladores: "🖥️",
  "safety-ffhh": "⚕️",
  "gestion-aeronautica": "📋",
};

export default function CursosDisponiblesPage() {
  const [courses, setCourses] = useState<AvailableCourse[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<
    { course_id: string; id: string; status: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Load all active courses with their sessions
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, title, code, description, area, area_slug, level, duration, modality, image_url, sessions(id, dates, location, modality, fee, is_active)")
        .eq("is_active", true)
        .order("title");

      if (coursesData) {
        setCourses(
          coursesData.map((c: any) => ({
            ...c,
            sessions: (c.sessions || []).filter((s: any) => s.is_active),
          }))
        );
      }

      // Load user's existing registrations
      if (user?.email) {
        const { data: regs } = await supabase
          .from("registrations")
          .select("id, course_id, status")
          .eq("email", user.email);

        if (regs) {
          setMyRegistrations(regs);
        }
      }

      setLoading(false);
    }

    load();
  }, []);

  function getRegistration(courseId: string) {
    return myRegistrations.find((r) => r.course_id === courseId);
  }

  async function handleEnroll(courseId: string, sessionId?: string) {
    setEnrollingId(courseId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/registro/interno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, sessionId }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMsg("Inscripcion exitosa. Puedes realizar el pago desde Mis Cursos.");
        // Update local state
        setMyRegistrations((prev) => [
          ...prev,
          { course_id: courseId, id: data.registrationId, status: "pending" },
        ]);
      } else {
        setErrorMsg(data.error || "Error al inscribirse.");
      }
    } catch {
      setErrorMsg("Error de conexion. Intenta nuevamente.");
    }

    setEnrollingId(null);
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">Cargando cursos...</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light text-gray-800">
          Cursos Disponibles
        </h1>
        <span className="text-sm text-gray-400">
          {courses.length} curso{courses.length !== 1 ? "s" : ""} activo{courses.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <Link href="/tpems" className="text-green-700 underline font-medium ml-4">
            Ir a Mis Cursos
          </Link>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {errorMsg}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-400">No hay cursos disponibles en este momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const reg = getRegistration(course.id);
            const nextSession = course.sessions[0];
            const isEnrolling = enrollingId === course.id;

            return (
              <div
                key={course.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition"
              >
                <div className="flex">
                  {/* Thumbnail */}
                  <div className="w-28 sm:w-40 shrink-0 relative overflow-hidden">
                    {course.image_url ? (
                      <img
                        src={course.image_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#003366] to-[#004B87] flex items-center justify-center">
                        <span className="text-3xl">
                          {areaIcons[course.area_slug] || "📋"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-gray-800 mb-0.5">
                          {course.title}
                        </h2>
                        {course.code && (
                          <p className="text-xs text-gray-400 mb-1">
                            {course.code}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                          {course.description}
                        </p>
                      </div>

                      {/* Status / Action */}
                      <div className="shrink-0">
                        {reg ? (
                          reg.status === "pending" ? (
                            <Link
                              href={`/tpems/curso/${reg.id}`}
                              className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition"
                            >
                              Pendiente de pago
                            </Link>
                          ) : (
                            <Link
                              href={`/tpems/curso/${reg.id}`}
                              className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 border border-green-200 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-200 transition"
                            >
                              Ya inscrito
                            </Link>
                          )
                        ) : (
                          <button
                            onClick={() =>
                              handleEnroll(course.id, nextSession?.id)
                            }
                            disabled={isEnrolling}
                            className="inline-flex items-center gap-1.5 bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white text-xs font-medium px-4 py-2 rounded-lg transition"
                          >
                            {isEnrolling ? (
                              "Inscribiendo..."
                            ) : (
                              <>
                                Inscribirme
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                                  />
                                </svg>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Course meta */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {course.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {course.modality}
                      </span>
                      <span>{course.area}</span>
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {course.level}
                      </span>
                      {nextSession && (
                        <>
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {nextSession.dates}
                          </span>
                          {nextSession.fee && (
                            <span className="font-medium text-[#003366]">
                              {nextSession.fee}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
