"use client";

import { useRef, useState } from "react";
import { courses, areas } from "@/data/courses";
import CourseCard from "@/components/CourseCard";
import Link from "next/link";

export default function Home() {
  const [activeArea, setActiveArea] = useState("todos");
  const [search, setSearch] = useState("");
  const coursesRef = useRef<HTMLElement>(null);

  const filtered = courses.filter((c) => {
    const matchesArea = activeArea === "todos" || c.areaSlug === activeArea;
    const matchesSearch =
      search === "" ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    return matchesArea && matchesSearch;
  });

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#001d3d] via-[#003366] to-[#004B87] text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Catálogo de Formación Aeronáutica
            </h1>
            <p className="text-xl text-blue-200 mb-8 leading-relaxed">
              Explora nuestros programas de formación en aviación, sistemas no
              tripulados, seguridad aeronáutica y más. Certificaciones
              reconocidas por la DGAC.
            </p>

            {/* Search */}
            <div className="relative max-w-xl">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
                placeholder="Buscar cursos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-[#0072CE] focus:border-transparent text-lg"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
            {[
              { label: "Cursos Disponibles", value: courses.length.toString() },
              { label: "Áreas de Formación", value: (areas.length - 1).toString() },
              { label: "Sedes", value: "3" },
              { label: "Modalidades", value: "3" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center border border-white/10"
              >
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-blue-200 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Area filters */}
      <section className="bg-[#F0F2F5] border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {areas.map((area) => (
              <button
                key={area.slug}
                onClick={() => {
                  setActiveArea(area.slug);
                  coursesRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  activeArea === area.slug
                    ? "bg-[#003366] text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                {area.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Course grid */}
      <section ref={coursesRef} className="bg-[#F8F9FA] py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#003366]">
                {activeArea === "todos"
                  ? "Todos los Cursos"
                  : areas.find((a) => a.slug === activeArea)?.name}
              </h2>
              <p className="text-gray-500 mt-1">
                {filtered.length} curso{filtered.length !== 1 ? "s" : ""}{" "}
                disponible{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/cursos"
              className="text-[#0072CE] hover:text-[#004B87] text-sm font-medium hidden md:flex items-center gap-1"
            >
              Ver catálogo completo
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
            </Link>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-500">
                No se encontraron cursos
              </h3>
              <p className="text-gray-400 mt-1">
                Prueba con otro término o área de formación
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Hero image banner */}
      <section className="relative bg-[#001d3d] overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative h-[400px] md:h-[500px]">
            <img
              src="/img/Foto banner.png"
              alt="Instructores ENAE en entrenamiento práctico con drones"
              className="w-full h-full object-cover"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#001d3d]/80 via-[#001d3d]/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="max-w-xl">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Formación Práctica en Terreno
                </h2>
                <p className="text-blue-200 text-sm md:text-base mb-5">
                  Nuestros programas combinan teoría y práctica con equipamiento
                  de última generación en aeródromos certificados.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/calendario"
                    className="inline-flex items-center gap-2 bg-[#F57C00] hover:bg-[#E65100] text-white font-medium px-5 py-2.5 rounded-lg transition text-sm"
                  >
                    Ver Programación
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Link>
                  <Link
                    href="/admision"
                    className="inline-flex items-center gap-2 border border-white/30 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-white/10 transition text-sm"
                  >
                    Postular
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[#003366] text-center mb-2">
            Nuestras Sedes
          </h2>
          <p className="text-gray-500 text-center mb-10">
            Formación aeronáutica con presencia internacional
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                city: "Santiago, Chile",
                flag: "🇨🇱",
                detail: "Aeródromo Eulogio Sánchez, Tobalaba",
                courses: courses.filter((c) =>
                  c.locations.includes("Santiago, Chile")
                ).length,
                description:
                  "Sede principal con acceso directo a pista, hangar de simuladores y zona de vuelo RPAS.",
              },
              {
                city: "Bogotá, Colombia",
                flag: "🇨🇴",
                detail: "Centro de formación regional",
                courses: courses.filter((c) =>
                  c.locations.includes("Bogotá, Colombia")
                ).length,
                description:
                  "Programas de seguridad operacional y operaciones BVLOS para la región andina.",
              },
              {
                city: "Madrid, España",
                flag: "🇪🇸",
                detail: "Centro de formación europeo",
                courses: courses.filter((c) =>
                  c.locations.includes("Madrid, España")
                ).length,
                description:
                  "Cursos de navegación aérea y SMS con estándares EASA complementarios.",
              },
            ].map((loc) => (
              <div
                key={loc.city}
                className="bg-[#F8F9FA] rounded-xl p-6 border border-gray-200 hover:border-[#0072CE] hover:shadow-md transition"
              >
                <div className="text-4xl mb-3">{loc.flag}</div>
                <h3 className="text-xl font-bold text-[#003366] mb-1">
                  {loc.city}
                </h3>
                <p className="text-sm text-gray-500 mb-3">{loc.detail}</p>
                <p className="text-sm text-gray-600 mb-4">{loc.description}</p>
                <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#003366] px-3 py-1.5 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-[#0072CE] rounded-full" />
                  {loc.courses} cursos disponibles
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[#003366] to-[#004B87] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Comienza tu formación aeronáutica
          </h2>
          <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">
            Únete a la comunidad de profesionales formados en ENAE. Postula
            ahora y accede a becas y financiamiento.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/admision"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-[#003366] font-semibold rounded-lg hover:bg-blue-50 transition"
            >
              Postular Ahora
            </Link>
            <Link
              href="/contacto"
              className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition"
            >
              Solicitar Información
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
