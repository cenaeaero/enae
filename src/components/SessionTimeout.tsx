"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const IDLE_TIMEOUT = 60 * 60 * 1000; // 60 minutes
const WARNING_DURATION = 60; // 60 seconds countdown

export default function SessionTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_DURATION);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const logout = useCallback(async () => {
    // Clear timers
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    await supabase.auth.signOut();
    window.location.href = "/tpems/login";
  }, []);

  const resetIdleTimer = useCallback(() => {
    // Don't reset if warning is already showing
    if (showWarning) return;

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      // Show warning modal
      setShowWarning(true);
      setCountdown(WARNING_DURATION);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Time's up — auto logout
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT);
  }, [showWarning, logout]);

  const handleContinue = useCallback(() => {
    // User wants to continue
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowWarning(false);
    setCountdown(WARNING_DURATION);
    resetIdleTimer();
  }, [resetIdleTimer]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => resetIdleTimer();

    // Start the idle timer
    resetIdleTimer();

    // Listen for user activity
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetIdleTimer]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-gray-800 mb-2">Sesion a punto de expirar</h2>

        {/* Message */}
        <p className="text-sm text-gray-600 mb-4">
          Tu sesion se cerrara automaticamente por inactividad en:
        </p>

        {/* Countdown */}
        <div className="text-4xl font-bold text-[#003366] mb-6">
          {countdown}<span className="text-lg font-normal text-gray-400 ml-1">seg</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={logout}
            className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-lg text-sm font-medium transition"
          >
            Cerrar sesion
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 bg-[#0072CE] hover:bg-[#005fa3] text-white py-2.5 rounded-lg text-sm font-medium transition"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
