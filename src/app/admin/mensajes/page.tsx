"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Conversation = {
  registrationId: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  courseCode: string | null;
  lastMessage: string;
  lastSender: "student" | "staff";
  lastAt: string;
  unread: boolean; // heuristic: last sender is student
};

type Message = {
  id: string;
  message: string;
  sender_profile_id: string;
  created_at: string;
  profiles: { first_name: string; last_name: string; role: string; email?: string } | null;
};

export default function AdminMensajesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedReg, setSelectedReg] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const threadEnd = useRef<HTMLDivElement | null>(null);

  // Load conversations list
  async function loadConversations() {
    setLoading(true);
    setError("");
    await supabase.auth.getSession();

    // Group messages by registration_id, keep the latest
    const { data: msgs } = await supabase
      .from("course_messages")
      .select(
        "registration_id, message, created_at, sender_profile_id, profiles:sender_profile_id(role, first_name, last_name, email)"
      )
      .order("created_at", { ascending: false });

    if (!msgs || msgs.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Latest message per registration
    const seen = new Set<string>();
    const latestByReg: any[] = [];
    for (const m of msgs) {
      const regId = (m as any).registration_id;
      if (seen.has(regId)) continue;
      seen.add(regId);
      latestByReg.push(m);
    }

    const regIds = latestByReg.map((m) => m.registration_id);

    const { data: regs } = await supabase
      .from("registrations")
      .select("id, first_name, last_name, email, courses(title, code)")
      .in("id", regIds);

    const regMap = new Map((regs || []).map((r: any) => [r.id, r]));

    const convs: Conversation[] = latestByReg.map((m: any) => {
      const reg: any = regMap.get(m.registration_id);
      const senderEmail = (m.profiles?.email || "").toLowerCase();
      const studentEmail = (reg?.email || "").toLowerCase();
      // Sender is the student when their profile email matches the registration's
      // email. Everything else (admin, instructor, other staff) counts as staff.
      const lastSender: "student" | "staff" =
        senderEmail && studentEmail && senderEmail === studentEmail ? "student" : "staff";
      return {
        registrationId: m.registration_id,
        studentName: reg ? `${reg.first_name || ""} ${reg.last_name || ""}`.trim() : "—",
        studentEmail: reg?.email || "",
        courseTitle: reg?.courses?.title || "",
        courseCode: reg?.courses?.code || null,
        lastMessage: m.message,
        lastSender,
        lastAt: m.created_at,
        unread: lastSender === "student",
      };
    });

    setConversations(convs);
    setLoading(false);
  }

  async function loadThread(regId: string) {
    setLoadingThread(true);
    setMessages([]);
    const res = await fetch(`/api/mensajes?registrationId=${regId}`);
    const data = await res.json();
    if (res.ok) {
      setMessages(data.messages || []);
    } else {
      setError(data.error || "Error al cargar mensajes");
    }
    setLoadingThread(false);
    setTimeout(() => threadEnd.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    loadConversations();
    // Poll conversations every 20s to pick up new incoming messages
    const convInterval = setInterval(loadConversations, 20000);
    return () => clearInterval(convInterval);
  }, []);

  useEffect(() => {
    if (!selectedReg) return;
    loadThread(selectedReg);
    // Poll the active thread every 15s
    const threadInterval = setInterval(() => loadThread(selectedReg), 15000);
    return () => clearInterval(threadInterval);
  }, [selectedReg]);

  async function sendReply() {
    if (!reply.trim() || !selectedReg) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/mensajes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: selectedReg, message: reply.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al enviar");
    } else {
      setReply("");
      await loadThread(selectedReg);
      await loadConversations();
    }
    setSending(false);
  }

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.studentName.toLowerCase().includes(q) ||
      c.studentEmail.toLowerCase().includes(q) ||
      c.courseTitle.toLowerCase().includes(q)
    );
  });

  const active = conversations.find((c) => c.registrationId === selectedReg);
  const unreadCount = conversations.filter((c) => c.unread).length;

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mensajes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {conversations.length === 0 && !loading
              ? "Sin conversaciones aún."
              : `${conversations.length} conversaciones · `}
            {unreadCount > 0 && <span className="text-red-600 font-medium">{unreadCount} sin responder</span>}
          </p>
        </div>
        <button
          onClick={loadConversations}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-220px)]">
        {/* Left: conversations list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="Buscar alumno, curso o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                {conversations.length === 0
                  ? "Aún no hay mensajes de alumnos."
                  : "Sin resultados para este filtro."}
              </div>
            ) : (
              filtered.map((c) => {
                const isActive = c.registrationId === selectedReg;
                return (
                  <button
                    key={c.registrationId}
                    onClick={() => setSelectedReg(c.registrationId)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 transition ${
                      isActive ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {c.unread && <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />}
                          <div className={`text-sm truncate ${c.unread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                            {c.studentName || c.studentEmail}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">{c.courseTitle}</div>
                        <div className={`text-xs truncate mt-1 ${c.unread ? "text-gray-700" : "text-gray-400"}`}>
                          {c.lastSender === "staff" && <span className="text-blue-600">Tú: </span>}
                          {c.lastMessage}
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 shrink-0">{formatTime(c.lastAt)}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: thread */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          {!selectedReg ? (
            <div className="flex-1 flex items-center justify-center p-10 text-center text-gray-400">
              <div>
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm">Selecciona una conversación para ver los mensajes.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">{active?.studentName}</h2>
                  <div className="text-xs text-gray-500">
                    {active?.studentEmail} · {active?.courseTitle}
                  </div>
                </div>
                <Link
                  href={`/admin/registros/${selectedReg}`}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded"
                >
                  Ver registro
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
                {loadingThread ? (
                  <div className="text-center text-gray-400 text-sm py-8">Cargando mensajes...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-8">Sin mensajes en este hilo.</div>
                ) : (
                  messages.map((m) => {
                    // Determine side by comparing sender email to the student's
                    // registration email. Role-based detection is unreliable
                    // because an admin may also be enrolled as a student.
                    const senderEmail = (m.profiles?.email || "").toLowerCase();
                    const studentEmail = (active?.studentEmail || "").toLowerCase();
                    const isStudent = senderEmail && studentEmail && senderEmail === studentEmail;
                    const isStaff = !isStudent;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                            isStaff
                              ? "bg-[#0072CE] text-white rounded-br-sm"
                              : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                          }`}
                        >
                          <div className={`text-[10px] mb-1 ${isStaff ? "text-blue-100" : "text-gray-400"}`}>
                            {isStaff
                              ? `ENAE${m.profiles?.first_name ? ` · ${m.profiles.first_name}` : ""}`
                              : (`${m.profiles?.first_name || ""} ${m.profiles?.last_name || ""}`.trim() || "Alumno")}
                            {" · "}
                            {new Date(m.created_at).toLocaleString("es-CL", {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
                          {m.message}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={threadEnd} />
              </div>

              <div className="border-t border-gray-100 p-3">
                <div className="flex gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    placeholder="Escribe una respuesta... (Enter para enviar, Shift+Enter para nueva línea)"
                    rows={2}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:border-[#0072CE] focus:ring-1 focus:ring-[#0072CE] outline-none"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="bg-[#003366] hover:bg-[#004B87] disabled:bg-gray-300 text-white px-5 rounded-lg text-sm font-medium transition"
                  >
                    {sending ? "..." : "Enviar"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
