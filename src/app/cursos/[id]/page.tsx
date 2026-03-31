import { courses } from "@/data/courses";
import Link from "next/link";
import { notFound } from "next/navigation";
import CourseSessionsTable from "@/components/CourseSessionsTable";
import { DynamicObjectives, DynamicModules, DynamicPrerequisites, DynamicImage, DynamicFee } from "@/components/CourseDetailDynamic";
import { fetchPublicCourse } from "@/lib/courses-public";

const areaIcons: Record<string, string> = {
  "uas-rpas": "🛩️",
  "atm-navegacion": "🗼",
  "seguridad-avsec": "🛡️",
  simuladores: "🖥️",
  "safety-ffhh": "⚕️",
  "gestion-aeronautica": "📋",
};

const levelColors: Record<string, string> = {
  Básico: "bg-green-100 text-green-800",
  Intermedio: "bg-blue-100 text-blue-800",
  Avanzado: "bg-purple-100 text-purple-800",
  Especialización: "bg-orange-100 text-orange-800",
};

// Static params for legacy static courses
export function generateStaticParams() {
  return courses.map((c) => ({ id: c.id }));
}

// Allow dynamic params (Supabase UUIDs) beyond the static ones
export const dynamicParams = true;

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Try Supabase first (handles UUIDs from admin + checks is_active)
  let course = await fetchPublicCourse(id);

  // Fall back to static data for legacy course slugs
  if (!course) {
    const staticCourse = courses.find((c) => c.id === id);
    if (staticCourse) {
      course = staticCourse;
    }
  }

  if (!course) {
    notFound();
  }

  return (
    <>
      {/* Cover image / color block */}
      <section className="bg-gradient-to-br from-[#003366] to-[#004B87] text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          {/* Breadcrumbs */}
          <nav className="text-sm text-blue-200 mb-4 flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-white transition">
              Inicio
            </Link>
            <span>/</span>
            <Link href="/cursos" className="hover:text-white transition">
              Cursos
            </Link>
            <span>/</span>
            <Link
              href={`/cursos?area=${course.areaSlug}`}
              className="hover:text-white transition"
            >
              {course.area}
            </Link>
            {course.subarea && (
              <>
                <span>/</span>
                <span>{course.subarea}</span>
              </>
            )}
          </nav>

          {/* Course code */}
          {course.code && (
            <p className="text-blue-300 text-sm font-mono mb-2">
              {course.code}
            </p>
          )}

          {/* Title */}
          <div className="flex items-start gap-4">
            <div className="text-5xl hidden sm:block">
              {areaIcons[course.areaSlug] || "📋"}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                {course.title}
              </h1>
              <p className="text-blue-200 text-lg max-w-3xl">
                {course.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="bg-[#F8F9FA] py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main content area */}
            <div className="flex-1 min-w-0 space-y-8">
              {/* Goal */}
              {course.goal && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-[#003366] mb-3 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-[#0072CE]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Objetivo
                  </h2>
                  <p className="text-gray-600 leading-relaxed">{course.goal}</p>
                </div>
              )}

              {/* Learning objectives (dynamic from Supabase) */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-[#003366] mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#0072CE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Objetivos de Aprendizaje
                </h2>
                <DynamicObjectives courseCode={course.code} courseTitle={course.title} staticObjectives={course.objectives} />
              </div>

              {/* Modules / Course structure (dynamic from Supabase) */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-[#003366] mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#0072CE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Estructura del Curso
                </h2>
                <DynamicModules courseCode={course.code} courseTitle={course.title} staticModules={course.modules} />
              </div>

              {/* Prerequisites (dynamic from Supabase) */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-[#003366] mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#0072CE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Requisitos de Ingreso
                </h2>
                <DynamicPrerequisites courseCode={course.code} courseTitle={course.title} staticPrereqs={course.prerequisites} />
              </div>

              {/* Sessions table */}
              {course.sessions && course.sessions.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-[#003366] mb-4 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-[#0072CE]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Sesiones Programadas
                  </h2>
                  <CourseSessionsTable
                    courseCode={course.code}
                    courseTitle={course.title}
                    fallbackSlug={course.id}
                  />
                </div>
              )}

              {/* Fallback: dynamic sessions from Supabase for courses without static sessions */}
              {(!course.sessions || course.sessions.length === 0) && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-[#003366] mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#0072CE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Sesiones Programadas
                  </h2>
                  <CourseSessionsTable
                    courseCode={course.code}
                    courseTitle={course.title}
                    fallbackSlug={course.id}
                  />
                </div>
              )}
            </div>

            {/* Sidebar - Course info card (ICAO style) */}
            <aside className="lg:w-80 shrink-0">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-28">
                {/* Header */}
                <div className="bg-[#003366] text-white p-5">
                  <h3 className="font-semibold text-sm uppercase tracking-wider mb-3">
                    Información del Curso
                  </h3>
                  <div className="aspect-video overflow-hidden">
                    <DynamicImage
                      courseCode={course.code}
                      courseTitle={course.title}
                      fallback={
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          {areaIcons[course.areaSlug] || "📋"}
                        </div>
                      }
                    />
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Info rows */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Modalidad
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {course.modality}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Duración
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {course.duration}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Nivel
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${levelColors[course.level] || "bg-gray-100 text-gray-800"}`}
                    >
                      {course.level}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Idioma
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {course.language || "Español"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Área
                    </span>
                    <span className="text-sm font-medium text-gray-700 text-right">
                      {course.area}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">
                      Sede
                    </span>
                    <span className="text-sm font-medium text-gray-700 text-right">
                      {course.locations.join(", ")}
                    </span>
                  </div>

                  <DynamicFee courseCode={course.code} courseTitle={course.title} fallbackFee={course.sessions?.[0]?.fee} />

                  {/* CTA buttons */}
                  <div className="space-y-3 pt-2">
                    <Link
                      href={`/registro/${course.id}`}
                      className="block w-full py-3 bg-[#0072CE] text-white text-center font-semibold rounded-lg hover:bg-[#005fa3] transition"
                    >
                      Registrarse
                    </Link>
                    <Link
                      href="/contacto"
                      className="block w-full py-3 border-2 border-[#003366] text-[#003366] text-center font-semibold rounded-lg hover:bg-blue-50 transition"
                    >
                      Más Información
                    </Link>
                  </div>
                </div>

                {/* Developer */}
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
                  <p className="text-xs text-gray-400">Desarrollado por</p>
                  <p className="text-sm font-medium text-gray-600">
                    Escuela de Navegación Aérea (ENAE)
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {/* Back button */}
          <div className="mt-8">
            <Link
              href="/cursos"
              className="inline-flex items-center gap-2 text-[#0072CE] hover:text-[#004B87] font-medium transition"
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
              Volver al catálogo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
