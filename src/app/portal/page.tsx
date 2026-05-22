"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Option = {
  key: "tpems" | "supervisor" | "instructor" | "admin";
  href: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
};

export default function PortalSelectorPage() {
  const router = useRouter();
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u?.email) { router.push("/tpems/login"); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, role, first_name, last_name")
        .eq("email", u.email)
        .maybeSingle();
      if (!prof) { router.push("/tpems"); return; }

      setUser({ email: u.email, name: `${prof.first_name || ""} ${prof.last_name || ""}`.trim() });

      const opts: Option[] = [];

      // Admin
      if (prof.role === "admin") {
        opts.push({
          key: "admin", href: "/admin", icon: "⚙️",
          title: "Panel Administrador",
          desc: "Gestión completa: cursos, alumnos, empresas, facturación, instructores",
          color: "from-red-600 to-red-700",
        });
      }

      // Instructor
      if (prof.role === "instructor" || prof.role === "admin") {
        const { count } = await supabase
          .from("instructor_assignments").select("id", { count: "exact", head: true })
          .eq("instructor_email", u.email);
        // Mostrar la opción si tiene asignaciones O si role es instructor
        if (prof.role === "instructor" || (count && count > 0)) {
          opts.push({
            key: "instructor", href: "/instructor", icon: "🧑‍🏫",
            title: "Portal Instructor",
            desc: "Mis alumnos asignados, calificaciones, honorarios",
            color: "from-blue-600 to-blue-700",
          });
        }
      }

      // Supervisor (por asignación en company_supervisors)
      const { count: supCount } = await supabase
        .from("company_supervisors").select("id", { count: "exact", head: true })
        .eq("profile_id", prof.id);
      if (supCount && supCount > 0) {
        opts.push({
          key: "supervisor", href: "/supervisor", icon: "🏢",
          title: "Portal Supervisor",
          desc: "Avance de los alumnos de tu(s) empresa(s)",
          color: "from-slate-600 to-slate-700",
        });
      }

      // Alumno (si tiene inscripciones)
      const { count: regCount } = await supabase
        .from("registrations").select("id", { count: "exact", head: true })
        .eq("email", u.email);
      if (regCount && regCount > 0) {
        opts.push({
          key: "tpems", href: "/tpems", icon: "🎓",
          title: "Portal Alumno",
          desc: "Tus cursos, notas y diplomas",
          color: "from-indigo-600 to-indigo-700",
        });
      }

      // Auto-redirect si solo hay una opción
      if (opts.length === 1) {
        window.location.href = opts[0].href;
        return;
      }
      // Si no hay ninguna, va al portal alumno por default
      if (opts.length === 0) {
        window.location.href = "/tpems";
        return;
      }

      setOptions(opts);
      setLoading(false);
    })();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/tpems/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECEFF1] text-gray-400">
        Cargando portales disponibles…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001d3d] via-[#003366] to-[#004B87] flex flex-col items-center justify-center px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-white">
          Hola, <strong>{user?.name || user?.email}</strong>
        </h1>
        <p className="text-blue-200 mt-2 text-sm">Tienes varios portales disponibles. ¿A cuál quieres entrar?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full">
        {options.map((o) => (
          <a key={o.key} href={o.href}
            className={`block p-6 rounded-xl text-white bg-gradient-to-br ${o.color} hover:scale-[1.02] transition shadow-lg`}>
            <div className="text-4xl mb-3">{o.icon}</div>
            <h2 className="font-bold text-lg mb-1">{o.title}</h2>
            <p className="text-sm opacity-80">{o.desc}</p>
            <p className="text-xs opacity-60 mt-3">Entrar →</p>
          </a>
        ))}
      </div>

      <button onClick={logout} className="mt-8 text-xs text-blue-200 hover:text-white">
        Cerrar sesión
      </button>
    </div>
  );
}
