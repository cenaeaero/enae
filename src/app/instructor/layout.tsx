"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/instructor/login");
    router.refresh();
  }

  if (pathname === "/instructor/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[calc(100vh-130px)]">
      <aside className="w-64 bg-[#001d3d] text-white shrink-0 hidden lg:block relative">
        <div className="p-5 border-b border-blue-800">
          <h2 className="font-bold text-lg">Panel Instructor</h2>
          <p className="text-xs text-blue-300 mt-0.5">ENAE Training</p>
        </div>
        <nav className="p-3 space-y-1">
          <Link
            href="/instructor"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
              pathname === "/instructor" ? "bg-[#0072CE] text-white" : "text-blue-200 hover:bg-[#003366]"
            }`}
          >
            <span>📚</span> Mis Cursos
          </Link>
        </nav>
        <div className="absolute bottom-4 left-4 right-4 space-y-1">
          <Link href="/" className="flex items-center gap-2 px-4 py-2 text-xs text-blue-300 hover:text-white transition">
            ← Volver al sitio
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-xs text-red-300 hover:text-red-100 transition w-full"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 p-6 lg:p-8 overflow-auto">{children}</main>
    </div>
  );
}
