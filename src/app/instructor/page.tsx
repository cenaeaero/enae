"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Course = { id: string; title: string; code: string | null; area: string | null };

export default function InstructorDashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        router.replace("/instructor/login");
        return;
      }
      setEmail(user.email);

      const res = await fetch("/api/instructor/cursos");
      if (res.status === 403) {
        setError("Tu cuenta no tiene cursos asignados como instructor. Contacta al administrador.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Error cargando cursos");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setCourses(data.courses || []);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return <div className="text-gray-400">Cargando...</div>;
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Mis Cursos</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mis Cursos</h1>
        <p className="text-gray-500 text-sm mt-1">Hola {email}. Selecciona un curso para ingresar notas de evaluación práctica.</p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
          No tienes cursos asignados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/instructor/cursos/${c.id}/calificaciones`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-[#0072CE] transition"
            >
              <div className="text-xs text-[#0072CE] font-semibold uppercase mb-1">{c.area || "Curso"}</div>
              <h2 className="font-bold text-gray-800 mb-1">{c.title}</h2>
              {c.code && <p className="text-xs text-gray-500">{c.code}</p>}
              <div className="mt-3 text-xs text-gray-400">Ingresar calificaciones →</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
