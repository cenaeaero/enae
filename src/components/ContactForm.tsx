"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Formulario "Solicitar información": guarda el interesado (lead) y avisa al admin.
export default function ContactForm() {
  const [cursos, setCursos] = useState<string[]>([]);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", course_interest: "", message: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    supabase.from("courses").select("title").eq("is_active", true).order("title")
      .then(({ data }) => setCursos((data || []).map((c: any) => c.title).filter(Boolean)));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) { setError("El email es obligatorio"); return; }
    setSending(true); setError("");
    const res = await fetch("/api/leads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSending(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "No se pudo enviar"); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <p className="text-2xl mb-2">✅</p>
        <p className="font-semibold text-green-800">¡Gracias! Recibimos tu consulta.</p>
        <p className="text-sm text-green-700 mt-1">Te contactaremos a la brevedad al correo indicado.</p>
      </div>
    );
  }

  const field = "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0072CE] focus:border-transparent";
  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input type="text" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className={field} placeholder="Tu nombre" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
          <input type="text" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className={field} placeholder="Tu apellido" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={field} placeholder="tu@email.com" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
        <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={field} placeholder="+56 9 1234 5678" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Curso de interés</label>
        <select value={form.course_interest} onChange={(e) => set("course_interest", e.target.value)} className={`${field} text-gray-600`}>
          <option value="">Seleccionar curso</option>
          {cursos.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="Otro">Otro</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
        <textarea rows={4} value={form.message} onChange={(e) => set("message", e.target.value)} className={field} placeholder="¿En qué podemos ayudarte?" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={sending}
        className="w-full py-3 bg-[#003366] text-white font-semibold rounded-lg hover:bg-[#004B87] disabled:opacity-50 transition">
        {sending ? "Enviando…" : "Enviar Consulta"}
      </button>
    </form>
  );
}
