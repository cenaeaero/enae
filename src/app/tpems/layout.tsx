"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

export default function TpemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(
          user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Participant"
        );
      }
    });
  }, []);

  // Login page renders without portal chrome
  if (pathname === "/tpems/login") {
    return <>{children}</>;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/tpems/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      {/* TPEMS Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Logo + Section */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/img/logo-enae.png"
                alt="ENAE"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-sm font-medium text-[#003366]">
                ENAE{" "}
                <span className="text-[#F57C00] font-normal">TPEMS</span>
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-gray-500">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">COURSE DELIVERY</span>
            </div>
          </div>

          {/* Center: Nav links */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/tpems"
              className="text-sm text-gray-500 hover:text-[#003366] transition"
            >
              Dashboard
            </Link>
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-[#003366] transition"
            >
              Catalogo de Cursos
            </Link>
          </div>

          {/* Right: User */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-[#F57C00]">{userName}</p>
              <p className="text-[10px] text-gray-400">
                Escuela de Navegación Aérea
              </p>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-500 transition ml-1"
              title="Cerrar sesión"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
