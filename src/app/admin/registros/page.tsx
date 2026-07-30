"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AlumnoRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  rut: string | null;
  folio_enae: string | null;
  organization: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  total_courses: number;
  completed_courses: number;
  in_progress_courses: number;
  course_ids: string[];
};

type CourseOption = { id: string; title: string };

export default function AdminRegistrosPage() {
  const [alumnos, setAlumnos] = useState<AlumnoRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "student" | "instructor" | "admin">("student");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/alumnos-listado");
    const data = await res.json();
    setAlumnos(data.alumnos || []);
    setCourses(data.courses || []);
    setLoading(false);
  }

  const companies = useMemo(() => {
    const s = new Set<string>();
    alumnos.forEach((a) => a.organization && s.add(a.organization));
    return Array.from(s).sort();
  }, [alumnos]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return alumnos.filter((a) => {
      if (filterRole !== "all" && a.role !== filterRole) return false;
      if (filterCompany && a.organization !== filterCompany) return false;
      if (filterCourse && !(a.course_ids || []).includes(filterCourse)) return false;
      if (!term) return true;
      return (
        a.first_name.toLowerCase().includes(term) ||
        a.last_name.toLowerCase().includes(term) ||
        (a.email || "").toLowerCase().includes(term) ||
        (a.rut || "").toLowerCase().includes(term) ||
        (a.folio_enae || "").includes(term) ||
        (a.organization || "").toLowerCase().includes(term)
      );
    });
  }, [alumnos, q, filterCompany, filterCourse, filterRole]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Registros · Alumnos</h1>
          <p className="text-sm text-gray-500">
            Listado consolidado de alumnos. Click en una fila para ver la ficha completa (cursos, notas, diplomas, cotizaciones, facturas, observaciones).
          </p>
        </div>
        <div className="text-sm text-gray-400">{filtered.length} de {alumnos.length}</div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input type="text" placeholder="Buscar por nombre, RUT, folio, email, empresa…"
          value={q} onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[260px] py-2 px-3 border border-gray-300 rounded-lg text-sm"/>
        <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}
          className="py-2 px-3 border border-gray-300 rounded-lg text-sm">
          <option value="">Todas las empresas</option>
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}
          className="py-2 px-3 border border-gray-300 rounded-lg text-sm max-w-[260px]">
          <option value="">Todos los cursos</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as any)}
          className="py-2 px-3 border border-gray-300 rounded-lg text-sm">
          <option value="all">Todos los roles</option>
          <option value="student">Alumnos</option>
          <option value="instructor">Instructores</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading ? (
        <p className="text-center py-12 text-gray-400">Cargando alumnos…</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Alumno</th>
                <th className="px-4 py-3">RUT</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3 text-right">Cursos</th>
                <th className="px-4 py-3 text-right">Completados</th>
                <th className="px-4 py-3 text-right">En curso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-blue-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    <Link href={`/admin/registros/${a.id}`}>{a.folio_enae || "—"}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/registros/${a.id}`} className="block">
                      <p className="font-semibold text-[#003366]">{a.last_name}, {a.first_name}</p>
                      <p className="text-xs text-gray-500">{a.email}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{a.rut || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{a.organization || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{a.total_courses}</td>
                  <td className="px-4 py-3 text-right text-green-700">{a.completed_courses}</td>
                  <td className="px-4 py-3 text-right text-blue-700">{a.in_progress_courses}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
