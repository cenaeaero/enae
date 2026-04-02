"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function TpemsLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleForgotPassword() {
    if (!email) {
      setError("Ingresa tu email para recuperar tu contrasena.");
      return;
    }
    setError("");
    setResetLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/callback?next=/tpems/restablecer-clave` }
    );
    if (resetError) {
      setError(resetError.message);
    } else {
      setResetSent(true);
    }
    setResetLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
      window.location.href = "/tpems";
    } catch (err: any) {
      setError("Error de conexion. Intenta nuevamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#ECEFF1] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-3">
        <Image
          src="/img/logo-enae.png"
          alt="ENAE"
          width={50}
          height={50}
          className="object-contain"
        />
        <div className="border-l border-gray-300 pl-3">
          <span className="text-2xl font-light text-[#003366]">
            ENAE <span className="text-[#F57C00]">TPEMS</span>
          </span>
          <p className="text-[10px] text-gray-400 -mt-0.5 tracking-wider">
            ELECTRONIC MANAGEMENT SYSTEM
          </p>
        </div>
      </div>

      {/* Login card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-md p-8">
        <h1 className="text-3xl font-light text-center text-gray-700 mb-2">
          LOG IN
        </h1>
        <p className="text-center text-gray-400 mb-6">
          Ingresa tus credenciales de participante.
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <input
              type="email"
              placeholder="Tu Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-md text-gray-600 placeholder-gray-400 focus:outline-none focus:border-[#4FC3F7] focus:ring-1 focus:ring-[#4FC3F7] text-base"
            />
          </div>

          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <input
              type="password"
              placeholder="Tu Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-md text-gray-600 placeholder-gray-400 focus:outline-none focus:border-[#4FC3F7] focus:ring-1 focus:ring-[#4FC3F7] text-base"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#4FC3F7] hover:bg-[#29B6F6] disabled:bg-[#B3E5FC] text-white font-medium rounded-md transition text-base"
          >
            {loading ? "Ingresando..." : "Log in"}
          </button>

          {/* Forgot password */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="text-sm text-[#4FC3F7] hover:text-[#0288D1] transition"
            >
              {resetLoading ? "Enviando..." : "¿Olvidaste tu contrasena?"}
            </button>
          </div>

          {resetSent && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
              Hemos enviado un enlace para restablecer tu contrasena a <strong>{email}</strong>. Revisa tu bandeja de entrada.
            </div>
          )}
        </form>
      </div>

      <p className="mt-6 text-gray-400 text-sm">
        Al ingresar, accederás al sistema de gestión de cursos ENAE.
      </p>
      <a
        href="/"
        className="mt-3 inline-block text-[#4FC3F7] hover:text-[#0288D1] text-sm"
      >
        ← Volver al Catalogo de Cursos
      </a>
    </div>
  );
}
