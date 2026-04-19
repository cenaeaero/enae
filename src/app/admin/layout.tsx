"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  { href: "/admin/mensajes", label: "Mensajes", icon: "💬" },
  { href: "/admin/perfiles", label: "Perfiles", icon: "👥" },
  { href: "/admin/instructores", label: "Instructores", icon: "🧑‍🏫" },
  { href: "/admin/alumni", label: "Alumni", icon: "🎓" },
];

type PendingReg = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  course_title?: string;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [pending, setPending] = useState<PendingReg[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  async function loadPending() {
    try {
      const res = await fetch("/api/admin/registros");
      if (!res.ok) return;
      const json = await res.json();
      const regs = (json.registrations || []) as any[];
      const items: PendingReg[] = regs
        .filter((r) => r.status === "pending")
        .slice(0, 20)
        .map((r) => ({
          id: r.id,
          first_name: r.first_name,
          last_name: r.last_name,
          email: r.email,
          created_at: r.created_at,
          course_title: r.courses?.title,
        }));
      setPending(items);
    } catch {}
  }

  useEffect(() => {
    if (pathname === "/admin/login") return;
    loadPending();
    const interval = setInterval(loadPending, 60_000);
    return () => clearInterval(interval);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);

  function formatRelative(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  // Login page renders without admin chrome
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const unread = pending.length;

  return (
    <div className="flex min-h-[calc(100vh-130px)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#001d3d] text-white shrink-0 hidden lg:flex lg:flex-col min-h-[calc(100vh-130px)]">
        <div className="p-5 border-b border-blue-800 shrink-0 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-bold text-lg">Panel Admin</h2>
            <p className="text-xs text-blue-300 mt-0.5">ENAE Training</p>
          </div>
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative p-2 rounded-lg hover:bg-[#003366] transition"
              aria-label="Notificaciones"
            >
              <svg className="w-5 h-5 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute left-full top-0 ml-3 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 text-gray-800">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Registros pendientes</h3>
                  {unread > 0 && (
                    <span className="text-xs text-gray-400">{unread} por revisar</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {pending.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">
                      No hay registros pendientes
                    </div>
                  ) : (
                    pending.map((p) => (
                      <Link
                        key={p.id}
                        href={`/admin/registros/${p.id}`}
                        onClick={() => setNotifOpen(false)}
                        className="block px-4 py-3 border-b border-gray-50 hover:bg-gray-50"
                      >
                        <div className="text-sm font-medium text-gray-800">
                          {p.first_name} {p.last_name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {p.course_title || p.email}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{formatRelative(p.created_at)}</div>
                      </Link>
                    ))
                  )}
                </div>
                <Link
                  href="/admin/registros"
                  onClick={() => setNotifOpen(false)}
                  className="block text-center text-xs text-[#0072CE] hover:text-[#003366] py-2 border-t border-gray-100 font-medium"
                >
                  Ver todos los registros
                </Link>
              </div>
            )}
          </div>
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
