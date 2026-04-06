"use client";

import { useState, useMemo, useEffect } from "react";
import { programs as staticPrograms } from "@/data/programs";
import { areas } from "@/data/courses";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const typeColors: Record<string, string> = {
  Certificación: "bg-blue-50 text-blue-700 border-blue-200",
  Certificacion: "bg-blue-50 text-blue-700 border-blue-200",
  Diploma: "bg-purple-50 text-purple-700 border-purple-200",
  Programa: "bg-gray-50 text-gray-700 border-gray-200",
};

const areaIcons: Record<string, string> = {
  "uas-rpas": "🛩️",
  "atm-navegacion": "🗼",
  "seguridad-avsec": "🛡️",
  simuladores: "🖥️",
  "safety-ffhh": "⚕️",
  "gestion-aeronautica": "📋",
};

type ProgramDisplay = {
  id: string;
  title: string;
  area: string;
  areaSlug: string;
  type: string;
  duration: string;
  description: string;
  courseCount: number;
};

export default function ProgramasPage() {
  const [areaFilter, setAreaFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [programs, setPrograms] = useState<ProgramDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Try Supabase first
      const { data } = await supabase
        .from("programs")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (data && data.length > 0) {
        setPrograms(data.map((p: any) => ({
          id: p.slug || p.id,
          title: p.title,
          area: p.area,
          areaSlug: p.area_slug,
          type: p.type,
          duration: p.duration,
          description: p.description,
          courseCount: (p.course_ids || []).length,
        })));
      } else {
        // Fallback to static data
        setPrograms(staticPrograms.map((p) => ({
          id: p.id,
          title: p.title,
          area: p.area,
          areaSlug: p.areaSlug,
          type: p.type,
          duration: p.duration,
          description: p.description,
          courseCount: p.courseIds.length,
        })));
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return programs.filter((p) => {
      const matchArea = areaFilter === "todos" || p.areaSlug === areaFilter;
      const matchType = typeFilter === "todos" || p.type === typeFilter;
      return matchArea && matchType;
    });
  }, [areaFilter, typeFilter, programs]);

  return (
    <>
      {/* Header */}
      <section className="bg-[#003366] text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold">Programas de Formación</h1>
          <p className="text-blue-200 mt-1">
            Programas integrales de certificación y especialización aeronáutica
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Área de Formación
              </label>
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              >
                {areas.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full py-2.5 px-3 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
              >
                <option value="todos">Todos</option>
                <option value="Certificación">Certificación</option>
                <option value="Certificacion">Certificacion</option>
                <option value="Diploma">Diploma</option>
                <option value="Programa">Programa</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="bg-[#F8F9FA] py-8">
        <div className="max-w-5xl mx-auto px-4">
          {loading ? (
            <div className="text-center py-16 text-gray-400">Cargando programas...</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-medium text-gray-700">
                  {filtered.length} Programa{filtered.length !== 1 ? "s" : ""} en
                  total
                </p>
              </div>

              {filtered.length > 0 ? (
                <div className="space-y-4">
                  {filtered.map((program) => (
                    <Link
                      key={program.id}
                      href={`/programas/${program.id}`}
                      className="block bg-white rounded-lg border border-gray-200 hover:border-[#0072CE] hover:shadow-md transition overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row">
                        <div className="sm:w-24 h-20 sm:h-auto bg-gradient-to-br from-[#003366] to-[#004B87] flex items-center justify-center shrink-0">
                          <span className="text-3xl">
                            {areaIcons[program.areaSlug] || "📚"}
                          </span>
                        </div>
                        <div className="flex-1 p-5">
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                            ENAE — {program.area}
                          </p>
                          <h2 className="text-lg font-semibold text-[#003366] mb-2">
                            {program.title}
                          </h2>
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                            {program.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${typeColors[program.type] || "bg-gray-50 text-gray-700 border-gray-200"}`}
                            >
                              {program.type}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
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
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {program.duration}
                            </span>
                            <span className="text-xs text-gray-500">
                              {program.courseCount} curso
                              {program.courseCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-500">
                    No se encontraron programas
                  </h3>
                  <button
                    onClick={() => {
                      setAreaFilter("todos");
                      setTypeFilter("todos");
                    }}
                    className="mt-4 text-[#0072CE] font-medium hover:underline"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
