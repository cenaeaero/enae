"use client";

import Link from "next/link";
import { courses } from "@/data/courses";

export default function AdminDashboard() {
  // For now, use static data. Will switch to Supabase once connected.
  const totalCourses = courses.length;
  const activeCourses = courses.length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003366] mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Total Cursos</div>
          <div className="text-3xl font-bold text-[#003366] mt-1">
            {totalCourses}
          </div>
          <Link
            href="/admin/cursos"
            className="text-xs text-[#0072CE] mt-2 inline-block"
          >
            Ver todos →
          </Link>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Cursos Activos</div>
          <div className="text-3xl font-bold text-green-600 mt-1">
            {activeCourses}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Registros Pendientes</div>
          <div className="text-3xl font-bold text-orange-500 mt-1">0</div>
          <Link
            href="/admin/registros"
            className="text-xs text-[#0072CE] mt-2 inline-block"
          >
            Ver registros →
          </Link>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Perfiles</div>
          <div className="text-3xl font-bold text-[#003366] mt-1">0</div>
          <Link
            href="/admin/perfiles"
            className="text-xs text-[#0072CE] mt-2 inline-block"
          >
            Ver perfiles →
          </Link>
        </div>
      </div>

      {/* Setup notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-[#003366] mb-2">
          Configuración de Supabase
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Para activar la base de datos y gestión completa, sigue estos pasos:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>
            Crea un proyecto en{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener"
              className="text-[#0072CE] underline"
            >
              supabase.com
            </a>
          </li>
          <li>
            Copia el <strong>Project URL</strong> y <strong>anon key</strong> al
            archivo <code className="bg-gray-100 px-1 rounded">.env.local</code>
          </li>
          <li>
            Ejecuta el esquema SQL en{" "}
            <code className="bg-gray-100 px-1 rounded">
              supabase/schema.sql
            </code>{" "}
            en el SQL Editor de Supabase
          </li>
          <li>Reinicia el servidor de desarrollo</li>
        </ol>
      </div>

      {/* Quick actions */}
      <h2 className="text-lg font-semibold text-[#003366] mb-4">
        Acciones Rápidas
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/cursos/nuevo"
          className="bg-white rounded-lg border border-gray-200 p-5 hover:border-[#0072CE] hover:shadow-md transition group"
        >
          <div className="text-2xl mb-2">➕</div>
          <h3 className="font-semibold text-[#003366] group-hover:text-[#0072CE]">
            Nuevo Curso
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Crear un nuevo curso en el catálogo
          </p>
        </Link>
        <Link
          href="/admin/registros"
          className="bg-white rounded-lg border border-gray-200 p-5 hover:border-[#0072CE] hover:shadow-md transition group"
        >
          <div className="text-2xl mb-2">📋</div>
          <h3 className="font-semibold text-[#003366] group-hover:text-[#0072CE]">
            Ver Registros
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Gestionar inscripciones de estudiantes
          </p>
        </Link>
        <Link
          href="/admin/perfiles"
          className="bg-white rounded-lg border border-gray-200 p-5 hover:border-[#0072CE] hover:shadow-md transition group"
        >
          <div className="text-2xl mb-2">👥</div>
          <h3 className="font-semibold text-[#003366] group-hover:text-[#0072CE]">
            Gestionar Perfiles
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Administrar estudiantes, instructores y admins
          </p>
        </Link>
      </div>
    </div>
  );
}
