"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/admin/login/callback`,
      },
    });
    if (authError) {
      setError(authError.message);
      setGoogleLoading(false);
    }
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
            ? "Credenciales incorrectas. Verifica tu email y contrasena."
            : authError.message
        );
        setLoading(false);
        return;
      }

      // Small delay to ensure cookies are set before redirect
      await new Promise((r) => setTimeout(r, 500));
      window.location.href = "/admin";
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
          width={60}
          height={60}
          className="object-contain"
        />
        <span className="text-3xl font-light text-[#003366] tracking-wide">
          ENAE <span className="text-[#546E7A]">ADMIN</span>
        </span>
      </div>

      {/* Login card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-md p-8">
        <h1 className="text-3xl font-light text-center text-gray-700 mb-2">
          LOG IN
        </h1>
        <p className="text-center text-gray-400 mb-6">
          Ingresa tus credenciales de administrador.
        </p>

        <hr className="mb-6 border-gray-100" />

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition text-base font-medium"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {googleLoading ? "Conectando..." : "Continuar con Google"}
        </button>

        {/* Separator */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 uppercase">o</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
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

          {/* Password */}
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
              placeholder="Tu Contrasena"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-md text-gray-600 placeholder-gray-400 focus:outline-none focus:border-[#4FC3F7] focus:ring-1 focus:ring-[#4FC3F7] text-base"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Forgot password link */}
          <div>
            <button
              type="button"
              className="text-[#4FC3F7] hover:text-[#0288D1] text-sm"
              onClick={() =>
                alert(
                  "Contacta al administrador del sistema para restablecer tu contrasena."
                )
              }
            >
              Olvidaste tu contrasena?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#4FC3F7] hover:bg-[#29B6F6] disabled:bg-[#B3E5FC] text-white font-medium rounded-md transition text-base"
          >
            {loading ? "Ingresando..." : "Log in"}
          </button>
        </form>
      </div>

      {/* Footer text */}
      <p className="mt-6 text-gray-400 text-sm">
        Al ingresar, accederas al panel de administracion de ENAE.
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
