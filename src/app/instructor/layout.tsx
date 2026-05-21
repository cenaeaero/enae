"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const nav = [
  { href: "/instructor", label: "Dashboard", icon: "📊" },
  { href: "/instructor/asignaciones", label: "Mis Alumnos", icon: "🎓" },
  { href: "/instructor/honorarios", label: "Honorarios", icon: "💰" },
  { href: "/instructor/perfil", label: "Mi Perfil", icon: "👤" },
];

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/instructor/login") { setAuthChecked(true); return; }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        router.push("/tpems/login?next=/instructor");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("email", user.email).maybeSingle();
      if (!profile || (profile.role !== "instructor" && profile.role !== "admin")) {
        router.push("/tpems");
        return;
      }
      setEmail(user.email);
      setAuthChecked(true);
    })();
  }, [router, pathname]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/tpems/login");
  }

  if (pathname === "/instructor/login") return <>{children}</>;
  if (!authChecked) return <div className="text-center py-16 text-gray-400">Cargando…</div>;

  return (
    <div className="flex min-h-[calc(100vh-130px)]">
      <aside className="w-60 bg-[#001d3d] text-white shrink-0 hidden lg:flex lg:flex-col">
        <div className="p-5 border-b border-blue-800">
          <h2 className="font-bold text-lg">Instructor</h2>
          <p className="text-xs text-blue-300 truncate mt-1">{email}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href || (n.href !== "/instructor" && pathname.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition ${
                  active ? "bg-[#0072CE] text-white" : "text-blue-100 hover:bg-[#003366]"
                }`}>
                <span>{n.icon}</span> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-blue-800 space-y-1">
          <Link href="/" className="block px-3 py-1 text-xs text-blue-300 hover:text-white">← Volver al sitio</Link>
          <button onClick={logout} className="block px-3 py-1 text-xs text-red-300 hover:text-red-100">Cerrar sesión</button>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 p-6 lg:p-8 overflow-auto">{children}</main>
    </div>
  );
}
