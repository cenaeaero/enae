"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type SessionRow = {
  id: string;
  dates: string;
  location: string;
  modality: string;
  fee: string | null;
  course_id: string;
  course_title: string;
  course_code: string | null;
  course_area: string;
  course_level: string;
  course_duration: string;
  course_language: string;
  month_key: string;
};

type ModalityFilter = "all" | "Presencial" | "Híbrido" | "Online";

const MONTHS_ORDER = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const MONTHS_FULL: Record<string, string> = {
  Ene: "Enero", Feb: "Febrero", Mar: "Marzo", Abr: "Abril",
  May: "Mayo", Jun: "Junio", Jul: "Julio", Ago: "Agosto",
  Sep: "Septiembre", Oct: "Octubre", Nov: "Noviembre", Dic: "Diciembre",
};

function extractMonth(dates: string): string {
  for (const m of MONTHS_ORDER) {
    if (dates.includes(m)) return m;
  }
  return "";
}

export default function CalendarioPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          `id, dates, location, modality, fee, course_id,
          courses!inner (title, code, area, level, duration, language, is_active)`
        )
        .eq("is_active", true)
        .eq("courses.is_active", true)
        .order("created_at");

      if (!error && data) {
        setSessions(
          data.map((s: any) => ({
            id: s.id,
            dates: s.dates,
            location: s.location,
            modality: s.modality,
            fee: s.fee,
            course_id: s.course_id,
            course_title: s.courses?.title || "",
            course_code: s.courses?.code || null,
            course_area: s.courses?.area || "",
            course_level: s.courses?.level || "",
            course_duration: s.courses?.duration || "",
            course_language: s.courses?.language || "Español",
            month_key: extractMonth(s.dates),
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  const locations = [...new Set(sessions.map((s) => s.location))].sort();
  const areas = [...new Set(sessions.map((s) => s.course_area))].sort();
  const languages = [...new Set(sessions.map((s) => s.course_language))].sort();

  const filtered = sessions.filter((s) => {
    if (modalityFilter !== "all" && s.modality !== modalityFilter) return false;
    if (locationFilter && s.location !== locationFilter) return false;
    if (areaFilter && s.course_area !== areaFilter) return false;
    if (languageFilter && s.course_language !== languageFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !s.course_title.toLowerCase().includes(q) &&
        !(s.course_code || "").toLowerCase().includes(q) &&
        !s.location.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // Group by month
  const groupedByMonth: Record<string, SessionRow[]> = {};
  for (const s of filtered) {
    const key = s.month_key || "Otros";
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(s);
  }

  // Sort months
  const sortedMonths = Object.keys(groupedByMonth).sort(
    (a, b) => MONTHS_ORDER.indexOf(a) - MONTHS_ORDER.indexOf(b)
  );

  const countAll = sessions.length;
  const countPresencial = sessions.filter((s) => s.modality === "Presencial").length;
  const countHibrido = sessions.filter((s) => s.modality === "Híbrido").length;
  const countOnline = sessions.filter((s) => s.modality === "Online").length;

  return (
    <>
      {/* Hero header */}
      <section className="bg-gradient-to-r from-[#003366] to-[#0072CE] text-white py-10">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Programación de Cursos</h1>
          <p className="text-blue-200 text-lg">Schedule of Upcoming Training Sessions</p>
          <div className="flex gap-6 mt-8 border-b border-white/20">
            {([
              { key: "all", label: "Todas las modalidades", count: countAll },
              { key: "Presencial", label: "Presencial", count: countPresencial },
              { key: "Híbrido", label: "Híbrido", count: countHibrido },
              { key: "Online", label: "Virtual", count: countOnline },
            ] as { key: ModalityFilter; label: string; count: number }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setModalityFilter(tab.key)}
                className={`pb-3 text-sm font-medium transition whitespace-nowrap ${
                  modalityFilter === tab.key
                    ? "text-white border-b-2 border-[#F57C00]"
                    : "text-blue-200 hover:text-white"
                }`}
              >
                {tab.label} <span className="text-blue-300">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-3">
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#0072CE] min-w-[140px]">
              <option value="">Ubicación</option>
              {locations.map((l) => (<option key={l} value={l}>{l}</option>))}
            </select>
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#0072CE] min-w-[160px]">
              <option value="">Área de Capacitación</option>
              {areas.map((a) => (<option key={a} value={a}>{a}</option>))}
            </select>
            <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#0072CE] min-w-[130px]">
              <option value="">Idioma</option>
              {languages.map((l) => (<option key={l} value={l}>{l}</option>))}
            </select>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#0072CE] w-48" />
            {(locationFilter || areaFilter || languageFilter || search) && (
              <button onClick={() => { setLocationFilter(""); setAreaFilter(""); setLanguageFilter(""); setSearch(""); }} className="text-sm text-[#0072CE] hover:underline px-2">
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Results grouped by month */}
      <section className="bg-[#F8F9FA] py-6">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm font-medium text-gray-700 mb-4">
            {filtered.length} Sesiones Programadas
          </p>

          {loading ? (
            <div className="text-center py-16 text-gray-400">Cargando programación...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No se encontraron sesiones con los filtros seleccionados</p>
            </div>
          ) : (
            <div className="space-y-8">
              {sortedMonths.map((monthKey) => (
                <div key={monthKey}>
                  <h2 className="text-lg font-bold text-[#003366] mb-3 flex items-center gap-3">
                    <span className="w-10 h-10 bg-[#003366] text-white rounded-lg flex items-center justify-center text-sm font-bold">
                      {monthKey}
                    </span>
                    {MONTHS_FULL[monthKey] || monthKey} 2026
                  </h2>

                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                          <th className="px-6 py-3 font-medium">Curso</th>
                          <th className="px-6 py-3 font-medium hidden sm:table-cell">Fechas</th>
                          <th className="px-6 py-3 font-medium hidden md:table-cell">Ubicación</th>
                          <th className="px-6 py-3 font-medium hidden lg:table-cell">Tarifa</th>
                          <th className="px-6 py-3 font-medium text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {groupedByMonth[monthKey]
                          .sort((a, b) => a.course_title.localeCompare(b.course_title))
                          .map((session) => (
                          <tr key={session.id} className="hover:bg-blue-50/30 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-[#003366] to-[#004B87] rounded-lg flex items-center justify-center shrink-0 hidden sm:flex">
                                  <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-[#003366] font-medium text-sm">{session.course_title}</p>
                                  {session.course_code && (
                                    <p className="text-xs text-gray-400 mt-0.5">{session.course_code}</p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-0.5">{session.course_area} | {session.course_duration}</p>
                                  <div className="sm:hidden mt-1 text-xs text-gray-500">
                                    <p>{session.dates}</p>
                                    <p>{session.location}</p>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 hidden sm:table-cell whitespace-nowrap">{session.dates}</td>
                            <td className="px-6 py-4 hidden md:table-cell">
                              {session.modality === "Online" ? (
                                <span className="inline-block bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded">Virtual</span>
                              ) : (
                                <span className="text-sm text-gray-700">{session.location}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-800 hidden lg:table-cell whitespace-nowrap">{session.fee || "Consultar"}</td>
                            <td className="px-6 py-4 text-right">
                              <Link href={`/registro/${session.id}`} className="inline-flex items-center gap-1.5 bg-[#4FC3F7] hover:bg-[#29B6F6] text-white text-xs font-medium px-4 py-2 rounded-full transition">
                                Inscripción
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
