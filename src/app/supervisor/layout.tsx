"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const nav = [
  { href: "/supervisor", label: "Dashboard", icon: "📊" },
  { href: "/supervisor/alumnos", label: "Mis Alumnos", icon: "🎓" },
  { href: "/supervisor/informes", label: "Informes", icon: "📊" },
  { href: "/supervisor/finanzas", label: "Finanzas", icon: "💰" },
];

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { router.push("/tpems/login?next=/supervisor"); return; }
      const { data: profile } = await supabase.from("profiles").select("id, role").eq("email", user.email).maybeSingle();
      if (!profile) { router.push("/tpems"); return; }
      // Admin entra siempre. Otros entran si tienen empresa asignada como supervisor.
      if (profile.role !== "admin") {
        const { count } = await supabase
          .from("company_supervisors").select("id", { count: "exact", head: true })
          .eq("profile_id", profile.id);
        if (!count) { router.push("/tpems"); return; }
      }
      setEmail(user.email);
      setAuthChecked(true);
    })();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/tpems/login");
  }

  if (!authChecked) return <div className="text-center py-16 text-gray-400">Cargando…</div>;

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-[#1a3a52] text-white shrink-0 hidden lg:flex lg:flex-col">
        <div className="p-5 border-b border-blue-900">
          <h2 className="font-bold text-lg">Supervisor</h2>
          <p className="text-xs text-blue-200 truncate mt-1">{email}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href || (n.href !== "/supervisor" && pathname.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition ${
                  active ? "bg-[#0072CE] text-white" : "text-blue-100 hover:bg-[#2a4a62]"
                }`}>
                <span>{n.icon}</span> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-blue-900 space-y-1">
          <Link href="/portal" className="block px-3 py-1 text-xs text-blue-300 hover:text-white">⇄ Cambiar portal</Link>
          <Link href="/" className="block px-3 py-1 text-xs text-blue-300 hover:text-white">← Volver al sitio</Link>
          <button onClick={logout} className="block px-3 py-1 text-xs text-red-300 hover:text-red-100">Cerrar sesión</button>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 p-6 lg:p-8 overflow-auto">{children}</main>
    </div>
  );
}
