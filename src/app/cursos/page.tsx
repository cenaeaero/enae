"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { courses as staticCourses, areas, Course } from "@/data/courses";
import { fetchActiveCourses } from "@/lib/courses-public";
import Link from "next/link";

const ITEMS_PER_PAGE = 9;

const levelColors: Record<string, string> = {
  Básico: "bg-green-100 text-green-800",
  Intermedio: "bg-blue-100 text-blue-800",
  Avanzado: "bg-purple-100 text-purple-800",
  Especialización: "bg-orange-100 text-orange-800",
};

type Tab = "all" | "presencial" | "online" | "hibrido";

export default function CursosPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-400">Cargando...</div>}>
      <CursosContent />
    </Suspense>
  );
}

function CursosContent() {
  const searchParams = useSearchParams();
  const urlArea = searchParams.get("area") || "todos";

  const [search, setSearch] = useState("");
  const [area, setArea] = useState(urlArea);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Load active courses from Supabase
  useEffect(() => {
    fetchActiveCourses()
      .then((dbCourses) => setCourses(dbCourses))
      .catch(() => setCourses(staticCourses))
      .finally(() => setLoading(false));
  }, []);

  // Sync area state when URL query param changes (e.g. header nav clicks)
  useEffect(() => {
    setArea(urlArea);
    setPage(1);
  }, [urlArea]);
  const [level, setLevel] = useState("Todos");
  const [tab, setTab] = useState<Tab>("all");
  const [orderBy, setOrderBy] = useState("title");
  const [page, setPage] = useState(1);
  const [upcomingOnly, setUpcomingOnly] = useState(false);

  const filtered = useMemo(() => {
    let result = courses.filter((c) => {
      const matchArea = area === "todos" || c.areaSlug === area;
      const matchLvl = level === "Todos" || c.level === level;
      const matchSearch =
        search === "" ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase());
      const matchTab =
        tab === "all" ||
        (tab === "presencial" && c.modality === "Presencial") ||
        (tab === "online" && c.modality === "Online") ||
        (tab === "hibrido" && c.modality === "Híbrido");
      return matchArea && matchLvl && matchSearch && matchTab;
    });

    if (orderBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (orderBy === "duration") {
      result.sort(
        (a, b) => parseInt(a.duration) - parseInt(b.duration)
      );
    } else if (orderBy === "area") {
      result.sort((a, b) => a.area.localeCompare(b.area));
    }

    return result;
  }, [courses, search, area, level, tab, orderBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const tabCounts = {
    all: courses.length,
    presencial: courses.filter((c) => c.modality === "Presencial").length,
    online: courses.filter((c) => c.modality === "Online").length,
    hibrido: courses.filter((c) => c.modality === "Híbrido").length,
  };

  function resetFilters() {
    setSearch("");
    setArea("todos");
    setLevel("Todos");
    setTab("all");
    setPage(1);
  }

  return (
    <>
      {/* Page header */}
      <section className="bg-[#003366] text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold">Catálogo de Cursos</h1>
        </div>
      </section>

      {/* Tabs - ICAO style */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto">
            {(
              [
                { key: "all", label: "Todos los Cursos", count: tabCounts.all },
                { key: "presencial", label: "Presencial", count: tabCounts.presencial },
                { key: "online", label: "Online", count: tabCounts.online },
                { key: "hibrido", label: "Híbrido", count: tabCounts.hibrido },
              ] as { key: Tab; label: string; count: number }[]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                }}
                className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  tab === t.key
                    ? "border-[#0072CE] text-[#0072CE]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main content: sidebar + course list */}
      <section className="bg-[#F8F9FA] py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
            <aside className="lg:w-72 shrink-0">
              <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5 sticky top-28">
                <h2 className="font-semibold text-[#003366] text-sm uppercase tracking-wider">
                  Filtros
                </h2>

                {/* Search */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Buscar
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="Nombre del curso..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Training area */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Área de Formación
                  </label>
                  <select
                    value={area}
                    onChange={(e) => {
                      setArea(e.target.value);
                      setPage(1);
                    }}
                    className="w-full py-2 px-3 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#0072CE]"
                  >
                    {areas.map((a) => (
                      <option key={a.slug} value={a.slug}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Nivel
                  </label>
                  <select
                    value={level}
                    onChange={(e) => {
                      setLevel(e.target.value);
                      setPage(1);
                    }}
                    className="w-full py-2 px-3 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#0072CE]"
                  >
                    {["Todos", "Básico", "Intermedio", "Avanzado", "Especialización"].map(
                      (l) => (
                        <option key={l} value={l}>
                          {l === "Todos" ? "Todos los niveles" : l}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={upcomingOnly}
                      onChange={(e) => setUpcomingOnly(e.target.checked)}
                      className="rounded border-gray-300 text-[#0072CE] focus:ring-[#0072CE]"
                    />
                    Próximas sesiones
                  </label>
                </div>

                {/* Reset */}
                <button
                  onClick={resetFilters}
                  className="w-full py-2 text-sm text-[#0072CE] hover:text-[#004B87] font-medium border border-[#0072CE] rounded hover:bg-blue-50 transition"
                >
                  Limpiar filtros
                </button>
              </div>
            </aside>

            {/* Course list */}
            <div className="flex-1 min-w-0">
              {/* Results header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                <p className="text-sm text-gray-500">
                  {filtered.length} curso{filtered.length !== 1 ? "s" : ""}{" "}
                  encontrado{filtered.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Ordenar por:</span>
                  <select
                    value={orderBy}
                    onChange={(e) => setOrderBy(e.target.value)}
                    className="py-1.5 px-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#0072CE]"
                  >
                    <option value="title">Título</option>
                    <option value="area">Área</option>
                    <option value="duration">Duración</option>
                  </select>
                </div>
              </div>

              {/* Course cards - ICAO list style */}
              {paged.length > 0 ? (
                <div className="space-y-4">
                  {paged.map((course) => (
                    <CourseListItem key={course.id} course={course} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-500">
                    No se encontraron cursos
                  </h3>
                  <button
                    onClick={resetFilters}
                    className="mt-4 text-[#0072CE] font-medium hover:underline"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 text-sm rounded ${
                          page === p
                            ? "bg-[#003366] text-white"
                            : "border border-gray-300 hover:bg-gray-50 text-gray-600"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function CourseListItem({ course }: { course: Course }) {
  return (
    <div
      id={course.id}
      className="bg-white rounded-lg border border-gray-200 hover:border-[#0072CE] hover:shadow-md transition overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Thumbnail / color block */}
        <div className="sm:w-48 h-32 sm:h-auto bg-gradient-to-br from-[#003366] to-[#004B87] flex items-center justify-center shrink-0">
          <div className="text-center text-white p-4">
            <div className="text-3xl mb-1">
              {course.areaSlug === "uas-rpas"
                ? "🛩️"
                : course.areaSlug === "atm-navegacion"
                  ? "🗼"
                  : course.areaSlug === "seguridad-avsec"
                    ? "🛡️"
                    : course.areaSlug === "simuladores"
                      ? "🖥️"
                      : course.areaSlug === "safety-ffhh"
                        ? "⚕️"
                        : "📋"}
            </div>
            <div className="text-xs text-blue-200">{course.area}</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <Link
              href={`/cursos/${course.id}`}
              className="text-lg font-semibold text-[#003366] hover:text-[#0072CE] transition"
            >
              {course.title}
            </Link>
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${levelColors[course.level] || "bg-gray-100 text-gray-800"}`}
            >
              {course.level}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {course.description}
          </p>

          {/* Meta grid - ICAO style */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-400 block">Modalidad</span>
              <span className="text-gray-700 font-medium">
                {course.modality}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">Duración</span>
              <span className="text-gray-700 font-medium">
                {course.duration}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">Sede</span>
              <span className="text-gray-700 font-medium">
                {course.locations.join(", ")}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">Próxima fecha</span>
              <span className="text-gray-700 font-medium">
                {course.dates[0] || "Por confirmar"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
