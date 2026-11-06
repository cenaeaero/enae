"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result = { key: string; name: string; email: string; role: string | null; href: string; courses: string[]; organization: string | null };

// Buscador global del panel admin: alumno por nombre, email, RUT o empresa.
export default function AdminSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/buscar?q=${encodeURIComponent(term)}`);
        const d = await r.json();
        setResults(d.results || []);
        setActive(0);
      } catch { setResults([]); }
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(r: Result) {
    setOpen(false);
    setQ("");
    router.push(r.href);
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === "Enter" && results[active]) go(results[active]);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="🔎 Buscar alumno, RUT, empresa…"
        className="w-full rounded-lg bg-[#003366] border border-blue-800 px-3 py-2 text-sm text-white placeholder-blue-300 focus:outline-none focus:border-[#0072CE]"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 top-full mt-1 w-[22rem] max-w-[80vw] bg-white rounded-lg shadow-xl border border-gray-200 z-50 text-gray-800 max-h-96 overflow-y-auto">
          {loading && results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">Buscando…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">Sin resultados</p>
          ) : results.map((r, i) => (
            <button key={r.key} onClick={() => go(r)} onMouseEnter={() => setActive(i)}
              className={`block w-full text-left px-4 py-2.5 border-b border-gray-50 ${i === active ? "bg-blue-50" : "hover:bg-gray-50"}`}>
              <p className="text-sm font-medium text-[#003366]">{r.name}
                {r.role && r.role !== "student" && <span className="ml-2 text-[10px] uppercase text-purple-600">{r.role}</span>}
              </p>
              <p className="text-[11px] text-gray-500 truncate">{[r.email, r.organization].filter(Boolean).join(" · ")}</p>
              {r.courses.length > 0 && <p className="text-[11px] text-gray-400 truncate">{r.courses.join(" · ")}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
