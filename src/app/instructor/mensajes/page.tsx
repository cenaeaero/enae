"use client";

import { useEffect, useRef, useState } from "react";

type Student = {
  registration_id: string;
  name: string;
  email: string;
  course: string | null;
  last_message: string | null;
  last_message_at: string | null;
};

type Msg = {
  id: string;
  message: string;
  created_at: string;
  profiles?: { first_name: string | null; last_name: string | null; role: string | null; email: string | null } | null;
};

export default function InstructorMensajesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | "admin" | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const [suffix, setSuffix] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("as_instructor");
    const s = q ? `&as_instructor=${q}` : "";
    setSuffix(s);
    (async () => {
      const res = await fetch(`/api/instructor/mensajes?_${s}`).then((r) => r.json());
      setStudents(res.students || []);
      setLoading(false);
    })();
  }, []);

  async function openThread(regId: string) {
    setSelected(regId);
    setMsg("");
    setLoadingThread(true);
    const res = await fetch(`/api/instructor/mensajes?registration_id=${regId}${suffix}`).then((r) => r.json());
    setThread(res.messages || []);
    setLoadingThread(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function send() {
    if (!text.trim() || !selected) return;
    setSending(true);
    setMsg("");
    const body = selected === "admin"
      ? { to_admin: true, subject, message: text }
      : { registration_id: selected, message: text };
    const res = await fetch("/api/instructor/mensajes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setSending(false);
    if (!res.ok) { setMsg(`Error: ${d.error || "No se pudo enviar"}`); return; }
    setText("");
    if (selected === "admin") {
      setSubject("");
      setMsg("✓ Mensaje enviado al administrador. Te responderá a tu correo.");
    } else {
      setMsg("✓ Mensaje enviado. El alumno recibió una notificación por correo.");
      openThread(selected);
    }
  }

  const sel = students.find((s) => s.registration_id === selected);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-[#003366] mb-4">Mensajes · Mesa de Ayuda</h1>

      <div className="flex flex-col md:flex-row gap-4 md:h-[calc(100vh-180px)]">
        {/* Lista de destinatarios */}
        <aside className="w-full md:w-72 shrink-0 bg-white border border-gray-200 rounded-lg flex flex-col max-h-64 md:max-h-none">
          <button
            onClick={() => { setSelected("admin"); setMsg(""); }}
            className={`text-left px-4 py-3 border-b border-gray-100 transition ${selected === "admin" ? "bg-blue-50 border-l-4 border-l-[#0072CE]" : "hover:bg-gray-50 border-l-4 border-l-transparent"}`}>
            <p className="text-sm font-semibold text-[#003366]">🛟 Administración ENAE</p>
            <p className="text-xs text-gray-500">Consultas, coordinación, problemas con la plataforma</p>
          </button>
          <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Mis alumnos</p>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <p className="p-4 text-sm text-gray-400">Cargando…</p>
            ) : students.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">Sin alumnos asignados.</p>
            ) : students.map((s) => (
              <button key={s.registration_id} onClick={() => openThread(s.registration_id)}
                className={`w-full text-left px-4 py-2.5 transition ${selected === s.registration_id ? "bg-blue-50 border-l-4 border-l-[#0072CE]" : "hover:bg-gray-50 border-l-4 border-l-transparent"}`}>
                <p className="text-sm font-medium text-[#003366] truncate">{s.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{s.last_message || s.course || s.email}</p>
              </button>
            ))}
          </div>
        </aside>

        {/* Panel de conversación */}
        <main className="flex-1 bg-white border border-gray-200 rounded-lg flex flex-col min-h-[400px]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-400">
              <div>
                <p className="text-4xl mb-2">💬</p>
                <p className="text-sm">Selecciona un alumno para escribirle,<br />o "Administración ENAE" para contactar al admin.</p>
              </div>
            </div>
          ) : selected === "admin" ? (
            <div className="p-6 flex-1 flex flex-col">
              <h2 className="font-semibold text-[#003366] mb-1">Mensaje al Administrador</h2>
              <p className="text-xs text-gray-500 mb-4">Tu mensaje llega al correo de la escuela (escuela@enae.cl) y te responderán directamente a tu email.</p>
              <input type="text" placeholder="Asunto (ej: cambio de fecha clase Antofagasta)" value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm mb-3" />
              <textarea rows={8} placeholder="Escribe tu consulta o solicitud…" value={text}
                onChange={(e) => setText(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm flex-1" />
              {msg && <p className={`text-sm mt-3 ${msg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>{msg}</p>}
              <div className="mt-3 flex justify-end">
                <button onClick={send} disabled={sending || !text.trim()}
                  className="bg-[#0072CE] hover:bg-[#005fa3] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded">
                  {sending ? "Enviando…" : "Enviar al admin"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="font-semibold text-[#003366] text-sm">{sel?.name}</p>
                <p className="text-xs text-gray-400">{sel?.course || sel?.email}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/50">
                {loadingThread ? (
                  <p className="text-sm text-gray-400">Cargando conversación…</p>
                ) : thread.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin mensajes aún. Escribe el primero — el alumno recibirá una notificación por correo.</p>
                ) : thread.map((m) => {
                  const isStaff = m.profiles?.role === "instructor" || m.profiles?.role === "admin";
                  const senderName = `${m.profiles?.first_name || ""} ${m.profiles?.last_name || ""}`.trim() || m.profiles?.email || "—";
                  return (
                    <div key={m.id} className={`max-w-[80%] ${isStaff ? "ml-auto" : ""}`}>
                      <div className={`rounded-lg px-3.5 py-2 text-sm ${isStaff ? "bg-[#0072CE] text-white" : "bg-white border border-gray-200 text-gray-800"}`}>
                        {m.message}
                      </div>
                      <p className={`text-[10px] text-gray-400 mt-0.5 ${isStaff ? "text-right" : ""}`}>
                        {senderName}{m.profiles?.role === "admin" ? " (admin)" : ""} · {new Date(m.created_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {msg && <p className={`text-xs px-5 pt-2 ${msg.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>{msg}</p>}
              <div className="p-4 border-t border-gray-100 flex gap-2">
                <textarea rows={2} placeholder="Escribe un mensaje…" value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm resize-none" />
                <button onClick={send} disabled={sending || !text.trim()}
                  className="bg-[#0072CE] hover:bg-[#005fa3] disabled:opacity-50 text-white text-sm font-semibold px-4 rounded self-stretch">
                  {sending ? "…" : "Enviar"}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
