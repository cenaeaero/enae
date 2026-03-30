"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type DbSession = {
  id: string;
  dates: string;
  location: string;
  modality: string;
  fee: string | null;
};

export default function CourseSessionsTable({
  courseCode,
  courseTitle,
  fallbackSlug,
}: {
  courseCode?: string;
  courseTitle: string;
  fallbackSlug: string;
}) {
  const [sessions, setSessions] = useState<DbSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Find course in DB by code or title
      let courseId: string | null = null;

      if (courseCode) {
        const { data } = await supabase
          .from("courses")
          .select("id")
          .eq("code", courseCode)
          .single();
        if (data) courseId = data.id;
      }

      if (!courseId) {
        const { data } = await supabase
          .from("courses")
          .select("id")
          .eq("title", courseTitle)
          .single();
        if (data) courseId = data.id;
      }

      if (courseId) {
        const { data } = await supabase
          .from("sessions")
          .select("id, dates, location, modality, fee")
          .eq("course_id", courseId)
          .eq("is_active", true)
          .order("created_at");

        if (data) setSessions(data as DbSession[]);
      }
      setLoading(false);
    }
    load();
  }, [courseCode, courseTitle]);

  if (loading) {
    return <div className="text-center py-4 text-gray-400 text-sm">Cargando sesiones...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">No hay sesiones programadas actualmente.</p>
        <Link href="/contacto" className="text-sm text-[#0072CE] hover:underline mt-1 inline-block">
          Solicitar información
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-sm text-gray-500">
              <th className="px-4 py-3 font-medium">Fechas</th>
              <th className="px-4 py-3 font-medium">Sede</th>
              <th className="px-4 py-3 font-medium">Modalidad</th>
              {sessions.some((s) => s.fee) && (
                <th className="px-4 py-3 font-medium">Valor</th>
              )}
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-blue-50/50 transition">
                <td className="px-4 py-3 text-sm font-medium text-gray-700">
                  {session.dates}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {session.location}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      session.modality === "Presencial"
                        ? "bg-green-100 text-green-700"
                        : session.modality === "Híbrido"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {session.modality}
                  </span>
                </td>
                {sessions.some((s) => s.fee) && (
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">
                    {session.fee || "—"}
                  </td>
                )}
                <td className="px-4 py-3">
                  <Link
                    href={`/registro/${session.id}`}
                    className="inline-flex items-center px-4 py-1.5 bg-[#0072CE] text-white text-xs font-medium rounded hover:bg-[#005fa3] transition"
                  >
                    Inscribirse
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link
          href="/contacto"
          className="text-sm text-[#0072CE] hover:text-[#004B87] font-medium"
        >
          ¿No encuentras fecha? Solicita información →
        </Link>
      </div>
    </>
  );
}
