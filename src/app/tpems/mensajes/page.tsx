"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type CourseThread = {
  registrationId: string;
  courseTitle: string;
  courseCode: string;
  lastMessage: string;
  lastDate: string;
  senderName: string;
  messageCount: number;
};

export default function MensajesPage() {
  const [threads, setThreads] = useState<CourseThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        setLoading(false);
        return;
      }

      // Get registrations
      const { data: regs } = await supabase
        .from("registrations")
        .select("id, courses(title, code)")
        .eq("email", user.email);

      if (!regs || regs.length === 0) {
        setLoading(false);
        return;
      }

      const courseThreads: CourseThread[] = [];

      for (const reg of regs) {
        const r = reg as any;
        const { data: msgs } = await supabase
          .from("course_messages")
          .select("id, message, created_at, profiles:sender_profile_id(first_name, last_name)")
          .eq("registration_id", r.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (msgs && msgs.length > 0) {
          const { count } = await supabase
            .from("course_messages")
            .select("id", { count: "exact", head: true })
            .eq("registration_id", r.id);

          const last = msgs[0] as any;
          courseThreads.push({
            registrationId: r.id,
            courseTitle: r.courses?.title || "Curso",
            courseCode: r.courses?.code || "",
            lastMessage: last.message,
            lastDate: last.created_at,
            senderName: `${last.profiles?.first_name || ""} ${last.profiles?.last_name || ""}`.trim(),
            messageCount: count || 0,
          });
        }
      }

      courseThreads.sort(
        (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()
      );
      setThreads(courseThreads);
      setLoading(false);
    }
    load();
  }, []);

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `hace ${days}d`;
    return new Date(dateStr).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-light text-gray-800 mb-6">Mensajes</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : threads.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="text-gray-500">No tienes mensajes</p>
          <p className="text-sm text-gray-400 mt-1">
            Los mensajes con instructores aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {threads.map((thread) => (
            <Link
              key={thread.registrationId}
              href={`/tpems/curso/${thread.registrationId}?tab=messages`}
              className="block px-5 py-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#0072CE]/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-[#0072CE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {thread.courseTitle}
                    </p>
                    <p className="text-xs text-gray-400">{thread.courseCode}</p>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      <span className="font-medium">{thread.senderName}:</span>{" "}
                      {thread.lastMessage}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">
                    {formatTimeAgo(thread.lastDate)}
                  </p>
                  <span className="inline-flex items-center justify-center mt-1 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-full min-w-[20px] h-[20px] px-1">
                    {thread.messageCount}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
