"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { areas } from "@/data/courses";
import { getCourses } from "@/lib/supabase-admin";

type CourseRow = {
  id: string;
  code: string | null;
  title: string;
  area: string;
  area_slug: string;
  level: string;
  modality: string;
  duration: string;
  is_active: boolean;
  image_url: string | null;
};

export default function AdminCursosPage() {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("todos");
  const [courseList, setCourseList] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCourses();
        setCourseList(data as CourseRow[]);
      } catch (err) {
        setError("Error conectando a Supabase: " + (err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = courseList.filter((c) => {
    const matchArea = area === "todos" || c.area_slug === area;
    const matchSearch =
      search === "" || c.title.toLowerCase().includes(search.toLowerCase());
    return matchArea && matchSearch;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[#003366]">
          Gestión de Cursos
        </h1>
        <Link
          href="/admin/cursos/nuevo"
          className="px-4 py-2 bg-[#0072CE] text-white text-sm font-medium rounded-lg hover:bg-[#005fa3] transition"
        >
          + Nuevo Curso
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Buscar cursos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
          />
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
        </div>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="py-2 px-3 border border-gray-300 rounded-lg text-sm"
        >
          {areas.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            Cargando cursos desde Supabase...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Curso</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">
                  Área
                </th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">
                  Nivel
                </th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">
                  Modalidad
                </th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">
                  Duración
                </th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((course) => (
                <tr
                  key={course.id}
                  className="hover:bg-blue-50/50 transition"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {course.image_url && (
                        <img
                          src={course.image_url}
                          alt=""
                          className="w-10 h-10 rounded object-cover shrink-0"
                        />
                      )}
                      <div>
                        <div className="font-medium text-sm text-[#003366]">
                          {course.title}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {course.code || course.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                    {course.area}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {course.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                    {course.modality}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                    {course.duration}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        course.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${course.is_active ? "bg-green-500" : "bg-red-500"}`}
                      />
                      {course.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/cursos/${course.id}`}
                        className="text-xs text-[#0072CE] hover:underline font-medium"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/cursos/${course.id}`}
                        className="text-xs text-gray-400 hover:underline"
                        target="_blank"
                      >
                        Ver
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        {filtered.length} curso{filtered.length !== 1 ? "s" : ""}
        {!loading && " (desde Supabase)"}
      </p>
    </div>
  );
}
