"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import ForcePasswordChangeModal from "@/components/ForcePasswordChangeModal";
import SessionTimeout from "@/components/SessionTimeout";

export default function TpemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<
    { id: string; course: string; message: string; date: string; registrationId: string }[]
  >([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(
          user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Participant"
        );
        setUserEmail(user.email || "");

        // Check if user must change password
        supabase
          .from("profiles")
          .select("must_change_password")
          .eq("user_id", user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.must_change_password) {
              setShowPasswordModal(true);
            }
          });
      }
    });
  }, []);

  // Load unread messages count
  const loadNotifications = useCallback(async () => {
    if (!userEmail) return;

    // Get user's registrations
    const { data: regs } = await supabase
      .from("registrations")
      .select("id, courses(title)")
      .eq("email", userEmail);

    if (!regs || regs.length === 0) return;

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (!profile) return;

    // Get recent messages NOT from this user (i.e. from instructor)
    const regIds = regs.map((r: any) => r.id);
    const { data: msgs } = await supabase
      .from("course_messages")
      .select("id, registration_id, message, created_at")
      .in("registration_id", regIds)
      .neq("sender_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (msgs) {
      const notifs = msgs.map((m: any) => {
        const reg = regs.find((r: any) => r.id === m.registration_id) as any;
        return {
          id: m.id,
          course: reg?.courses?.title || "Curso",
          message: m.message.length > 60 ? m.message.slice(0, 60) + "..." : m.message,
          date: m.created_at,
          registrationId: m.registration_id,
        };
      });
      setNotifications(notifs);
      setUnreadCount(notifs.length);
    }
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) loadNotifications();
  }, [userEmail, loadNotifications]);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Login and password reset pages render without portal chrome
  if (pathname === "/tpems/login" || pathname === "/tpems/restablecer-clave") {
    return <>{children}</>;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/tpems/login";
  }

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      {/* TPEMS Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Logo + Section */}
          <div className="flex items-center gap-4">
            <Link href="/tpems" className="flex items-center gap-2">
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
            </Link>
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
              className={`text-sm transition ${pathname === "/tpems" ? "text-[#003366] font-medium" : "text-gray-500 hover:text-[#003366]"}`}
            >
              Mis Cursos
            </Link>
            <Link
              href="/tpems/cursos-disponibles"
              className={`text-sm transition ${pathname === "/tpems/cursos-disponibles" ? "text-[#003366] font-medium" : "text-gray-500 hover:text-[#003366]"}`}
            >
              Cursos Disponibles
            </Link>
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-[#003366] transition"
            >
              Catalogo
            </Link>
          </div>

          {/* Right: Notifications + User dropdown */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setMenuOpen(false);
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">
                      Notificaciones
                    </h3>
                    {unreadCount > 0 && (
                      <span className="text-xs text-gray-400">
                        {unreadCount} nuevo{unreadCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-400 text-sm">
                        No hay notificaciones
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={`/tpems/curso/${n.registrationId}?tab=messages`}
                          onClick={() => setNotifOpen(false)}
                          className="block px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                        >
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0072CE]/10 flex items-center justify-center shrink-0 mt-0.5">
                              <svg
                                className="w-4 h-4 text-[#0072CE]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[#003366] truncate">
                                {n.course}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {formatTimeAgo(n.date)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => {
                  setMenuOpen(!menuOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-[#F57C00]">
                    {userName}
                  </p>
                  <p className="text-[10px] text-gray-400">ENAE</p>
                </div>
                <div className="w-8 h-8 bg-[#003366] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-800">
                      {userName}
                    </p>
                    <p className="text-xs text-gray-400">Participante</p>
                  </div>

                  <Link
                    href="/tpems"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                    </svg>
                    Mis Cursos
                  </Link>

                  <Link
                    href="/tpems/cursos-disponibles"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Cursos Disponibles
                  </Link>

                  <Link
                    href="/tpems/perfil"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mi Perfil
                  </Link>

                  <Link
                    href="/tpems/mensajes"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Mensajes
                    {unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/tpems/transacciones"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Transacciones
                  </Link>

                  <Link
                    href="/tpems/cambiar-clave"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Cambiar Contrasena
                  </Link>

                  <div className="border-t border-gray-100 mt-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition w-full"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar Sesion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Force password change modal for first login */}
      <ForcePasswordChangeModal
        isOpen={showPasswordModal}
        onComplete={() => setShowPasswordModal(false)}
      />

      {/* Session timeout — auto-logout after 60 min inactivity */}
      <SessionTimeout />
    </div>
  );
}
