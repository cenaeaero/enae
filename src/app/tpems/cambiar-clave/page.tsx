"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CambiarClavePage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
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
      setMessage("Contrasena actualizada correctamente.");
      setNewPassword("");
      setConfirmPassword("");
    }

    setSaving(false);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-light text-gray-800 mb-6">
        Cambiar Contrasena
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
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
              className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
            />
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
              className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
              {message}
            </div>
          )}
        </div>

        <div className="mt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#0072CE] hover:bg-[#005fa3] disabled:bg-blue-300 text-white font-medium rounded-lg transition text-sm"
          >
            {saving ? "Actualizando..." : "Cambiar Contrasena"}
          </button>
        </div>
      </form>
    </div>
  );
}
