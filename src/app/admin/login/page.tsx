"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Script from "next/script";

declare global {
  interface Window {
    turnstile: { render: (el: HTMLElement, opts: object) => string; reset: (id: string) => void; getResponse: (id: string) => string | undefined };
    onTurnstileLoad: () => void;
  }
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tsToken, setTsToken] = useState("");
  const tsRef = useRef<HTMLDivElement>(null);
  const tsWidgetId = useRef<string>("");

  useEffect(() => {
    window.onTurnstileLoad = () => {
      if (tsRef.current && !tsWidgetId.current) {
        tsWidgetId.current = window.turnstile.render(tsRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          theme: "light",
          callback: (token: string) => setTsToken(token),
          "expired-callback": () => setTsToken(""),
        });
      }
    };
  }, []);


  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!tsToken) {
      setError("Completa la verificación de seguridad.");
      return;
    }

    setLoading(true);

    try {
      const tsRes = await fetch("/api/turnstile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tsToken }),
      });
      const tsData = await tsRes.json();
      if (!tsData.success) {
        setError("Verificación de seguridad fallida. Intenta nuevamente.");
        if (tsWidgetId.current) window.turnstile.reset(tsWidgetId.current);
        setTsToken("");
        setLoading(false);
        return;
      }

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
        if (tsWidgetId.current) window.turnstile.reset(tsWidgetId.current);
        setTsToken("");
        setLoading(false);
        return;
      }

      await new Promise((r) => setTimeout(r, 500));
      window.location.href = "/admin";
    } catch (err: any) {
      setError("Error de conexion. Intenta nuevamente.");
      if (tsWidgetId.current) window.turnstile.reset(tsWidgetId.current);
      setTsToken("");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#ECEFF1] flex flex-col items-center justify-center px-4">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
        strategy="afterInteractive"
      />
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

          {/* Turnstile widget */}
          <div ref={tsRef} className="flex justify-center" />

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !tsToken}
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
