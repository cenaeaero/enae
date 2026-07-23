"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Selector de "Curso de interés" que carga los cursos activos desde la base,
// para que aparezcan todos (incl. SORA) sin tener que mantener una lista fija.
export default function ContactCourseSelect() {
  const [cursos, setCursos] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("title")
        .eq("is_active", true)
        .order("title");
      setCursos((data || []).map((c: any) => c.title).filter(Boolean));
    })();
  }, []);

  return (
    <select
      name="curso"
      defaultValue=""
      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0072CE] focus:border-transparent text-gray-600"
    >
      <option value="">Seleccionar curso</option>
      {cursos.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
      <option value="Otro">Otro</option>
    </select>
  );
}
