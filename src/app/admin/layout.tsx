"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/programas", label: "Programas", icon: "📦" },
  { href: "/admin/cursos", label: "Cursos", icon: "📚" },
  { href: "/admin/inscripcion", label: "Inscripción", icon: "✏️" },
  { href: "/admin/registros", label: "Registros", icon: "📋" },
  { href: "/admin/calificaciones", label: "Calificaciones", icon: "🎓" },
  { href: "/admin/diplomas", label: "Diplomas", icon: "📜" },
  { href: "/admin/pagos", label: "Pagos", icon: "💳" },
  { href: "/admin/encuestas", label: "Encuestas", icon: "📝" },
  { href: "/admin/perfiles", label: "Perfiles", icon: "👥" },
  { href: "/admin/instructores", label: "Instructores", icon: "🧑‍🏫" },
  { href: "/admin/alumni", label: "Alumni", icon: "🎓" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  // Login page renders without admin chrome
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[calc(100vh-130px)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#001d3d] text-white shrink-0 hidden lg:flex lg:flex-col min-h-[calc(100vh-130px)]">
        <div className="p-5 border-b border-blue-800 shrink-0">
          <h2 className="font-bold text-lg">Panel Admin</h2>
          <p className="text-xs text-blue-300 mt-0.5">ENAE Training</p>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-[#0072CE] text-white"
                    : "text-blue-200 hover:bg-[#003366]"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-blue-800 space-y-1 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-xs text-blue-300 hover:text-white transition"
          >
            ← Volver al sitio
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-xs text-red-300 hover:text-red-100 transition w-full"
          >
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#001d3d] border-t border-blue-800 z-50 flex">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs ${
                isActive ? "text-[#0072CE]" : "text-blue-300"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 p-6 lg:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
