"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function RestablecerClavePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#ECEFF1] flex items-center justify-center text-gray-400">Cargando...</div>}>
      <RestablecerClaveContent />
    </Suspense>
  );
}

function RestablecerClaveContent() {
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const isMinLength = newPassword.length >= 6;
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = isMinLength && passwordsMatch && !saving;

  useEffect(() => {
    // Handle PKCE flow: exchange code from URL for session
    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: codeError }) => {
        if (!codeError) {
          setSessionReady(true);
        } else {
          setError("El enlace ha expirado o es invalido. Solicita uno nuevo.");
        }
      });
      return;
    }

    // Handle implicit flow (hash tokens) as fallback
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Also check if already in a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isMinLength) {
      setError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }
    if (!passwordsMatch) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setSaving(true);

    const { error: authError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
      // Also clear must_change_password flag
      try {
        await fetch("/api/perfil/password-changed", { method: "POST" });
      } catch {}
    }

    setSaving(false);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#ECEFF1] flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#003366] mb-2">
            Contrasena actualizada
          </h2>
          <p className="text-gray-600 mb-6">
            Tu contrasena ha sido restablecida exitosamente.
          </p>
          <a
            href="/tpems"
            className="inline-block bg-[#4FC3F7] hover:bg-[#29B6F6] text-white font-medium px-6 py-3 rounded-lg transition"
          >
            Ir al Portal de Alumnos
          </a>
        </div>
      </div>
    );
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full max-w-md p-8">
        <h1 className="text-2xl font-light text-center text-gray-700 mb-2">
          Restablecer Contrasena
        </h1>
        <p className="text-center text-gray-400 mb-6">
          Ingresa tu nueva contrasena.
        </p>

        {!sessionReady ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Verificando enlace de restablecimiento...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Nueva contrasena
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Minimo 6 caracteres"
                className="w-full py-3 px-4 border border-gray-200 rounded-md text-gray-600 placeholder-gray-400 focus:outline-none focus:border-[#4FC3F7] focus:ring-1 focus:ring-[#4FC3F7]"
                autoFocus
              />
              {newPassword.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className={`w-3 h-3 rounded-full ${isMinLength ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className={`text-xs ${isMinLength ? "text-green-600" : "text-gray-400"}`}>
                    Minimo 6 caracteres ({newPassword.length}/6)
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Confirmar contrasena
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repite la contrasena"
                className="w-full py-3 px-4 border border-gray-200 rounded-md text-gray-600 placeholder-gray-400 focus:outline-none focus:border-[#4FC3F7] focus:ring-1 focus:ring-[#4FC3F7]"
              />
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className={`w-3 h-3 rounded-full ${passwordsMatch ? "bg-green-500" : "bg-red-400"}`} />
                  <span className={`text-xs ${passwordsMatch ? "text-green-600" : "text-red-500"}`}>
                    {passwordsMatch ? "Las contrasenas coinciden" : "Las contrasenas no coinciden"}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3.5 bg-[#4FC3F7] hover:bg-[#29B6F6] disabled:bg-[#B3E5FC] disabled:cursor-not-allowed text-white font-medium rounded-md transition text-base"
            >
              {saving ? "Actualizando..." : "Restablecer Contrasena"}
            </button>
          </form>
        )}
      </div>

      <a
        href="/tpems/login"
        className="mt-6 inline-block text-[#4FC3F7] hover:text-[#0288D1] text-sm"
      >
        ← Volver al Login
      </a>
    </div>
  );
}
