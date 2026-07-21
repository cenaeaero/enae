"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function InstructorLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Credenciales incorrectas. Verifica tu email y contraseña."
            : authError.message
        );
        setLoading(false);
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
      window.location.href = "/instructor";
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#ECEFF1] flex flex-col items-center justify-center px-4">
      <div className="mb-10 flex items-center gap-3">
        <Image src="/img/logo-enae.png" alt="ENAE" width={60} height={60} className="object-contain" />
        <span className="text-3xl font-light text-[#003366] tracking-wide">
          ENAE <span className="text-[#546E7A]">INSTRUCTOR</span>
        </span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-md p-8">
        <h1 className="text-3xl font-light text-center text-gray-700 mb-2">LOG IN</h1>
        <p className="text-center text-gray-400 mb-6">Ingresa con tu email de instructor.</p>
        <hr className="mb-6 border-gray-100" />

        <form onSubmit={handleLogin} className="space-y-5">
          <input
            type="email"
            placeholder="Tu Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3.5 border border-gray-200 rounded-md text-gray-600 placeholder-gray-400 focus:outline-none focus:border-[#4FC3F7] focus:ring-1 focus:ring-[#4FC3F7] text-base"
          />
          <input
            type="password"
            placeholder="Tu Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3.5 border border-gray-200 rounded-md text-gray-600 placeholder-gray-400 focus:outline-none focus:border-[#4FC3F7] focus:ring-1 focus:ring-[#4FC3F7] text-base"
          />
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#4FC3F7] hover:bg-[#29B6F6] disabled:bg-[#B3E5FC] text-white font-medium rounded-md transition text-base"
          >
            {loading ? "Ingresando..." : "Log in"}
          </button>
        </form>
      </div>

      <a href="/" className="mt-6 text-[#4FC3F7] hover:text-[#0288D1] text-sm">
        ← Volver al sitio
      </a>
    </div>
  );
}
