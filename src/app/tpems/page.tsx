"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Registration = {
  id: string;
  course_id: string;
  status: string;
  created_at: string;
  course_title?: string;
  course_code?: string;
  session_dates?: string;
  session_location?: string;
  session_modality?: string;
  session_fee?: string;
  institution?: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export default function TpemsDashboard() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function handlePay(reg: Registration) {
    if (!reg.session_fee) return;
    setPayingId(reg.id);

    // Parse fee string to number (e.g. "$350.000 CLP" → 350000)
    const amount = parseInt(reg.session_fee.replace(/[^0-9]/g, ""));
    if (!amount) {
      alert("No se pudo determinar el monto del pago.");
      setPayingId(null);
      return;
    }

    const res = await fetch("/api/pago/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: reg.id, amount }),
    });

    const data = await res.json();
    if (data.url && data.token) {
      // Redirect to Transbank with token via form POST
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.url;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "token_ws";
      input.value = data.token;
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } else {
      alert("Error al iniciar el pago: " + (data.error || "Intenta nuevamente"));
      setPayingId(null);
    }
  }

  useEffect(() => {
    async function loadRegistrations() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("registrations")
        .select(
          `
          id,
          course_id,
          status,
          created_at,
          courses (title, code),
          sessions (dates, location, modality, fee)
        `
        )
        .eq("email", user.email)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setRegistrations(
          data.map((r: any) => ({
            id: r.id,
            course_id: r.course_id,
            status: r.status,
            created_at: r.created_at,
            course_title: r.courses?.title,
            course_code: r.courses?.code,
            session_dates: r.sessions?.dates,
            session_location: r.sessions?.location,
            session_modality: r.sessions?.modality,
            session_fee: r.sessions?.fee,
            institution: "Escuela de Navegación Aérea (ENAE)",
          }))
        );

      }
      setLoading(false);
    }

    loadRegistrations();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-light text-gray-800 mb-6">
        Your Courses{" "}
        <span className="text-base text-gray-400">as Participant</span>
      </h1>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : registrations.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <svg
            className="w-16 h-16 text-gray-200 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            No tienes cursos registrados
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Inscríbete en un curso para verlo aquí.
          </p>
          <Link
            href="/cursos"
            className="text-[#0072CE] hover:underline text-sm font-medium"
          >
            Ver catálogo de cursos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => (
            <Link
              key={reg.id}
              href={`/tpems/curso/${reg.id}`}
              className="block bg-white rounded-lg border border-gray-200 hover:shadow-md transition overflow-hidden"
            >
              <div className="flex">
                {/* Thumbnail */}
                <div className="w-28 sm:w-36 bg-gradient-to-br from-[#003366] to-[#004B87] flex items-center justify-center shrink-0">
                  <div className="text-center text-white p-3">
                    <svg
                      className="w-8 h-8 mx-auto mb-1 opacity-60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-gray-800 mb-0.5">
                        {reg.course_title || "Curso"}
                      </h2>
                      {reg.course_code && (
                        <p className="text-xs text-gray-400 mb-3">
                          {reg.course_code}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded border shrink-0 ${statusColors[reg.status] || statusColors.pending}`}
                    >
                      {statusLabels[reg.status] || reg.status}
                    </span>
                  </div>

                  {/* Pay button */}
                  {reg.status === "pending" && reg.session_fee && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handlePay(reg);
                      }}
                      disabled={payingId === reg.id}
                      className="mt-2 mb-3 inline-flex items-center gap-2 bg-[#E91E63] hover:bg-[#C2185B] disabled:bg-pink-300 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
                    >
                      {payingId === reg.id ? (
                        "Procesando..."
                      ) : (
                        <>
                          Pagar {reg.session_fee}
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {reg.session_dates && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {reg.session_dates}
                      </span>
                    )}
                    {reg.session_location && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {reg.session_location}
                      </span>
                    )}
                    {reg.institution && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                          />
                        </svg>
                        {reg.institution}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}
