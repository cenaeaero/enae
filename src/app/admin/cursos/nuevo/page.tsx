"use client";

import { useState } from "react";
import { areas } from "@/data/courses";
import Link from "next/link";

export default function NuevoCursoPage() {
  const [modules, setModules] = useState<string[]>([""]);
  const [objectives, setObjectives] = useState<string[]>([""]);

  function addField(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter((prev) => [...prev, ""]);
  }

  function updateField(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) {
    setter((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function removeField(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) {
    setter((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/cursos"
          className="text-gray-400 hover:text-gray-600"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-[#003366]">Nuevo Curso</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          alert(
            "Curso guardado (conectar Supabase para persistencia real)"
          );
        }}
        className="space-y-6 max-w-4xl"
      >
        {/* Basic info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#003366] mb-4">
            Información Básica
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título del Curso *
              </label>
              <input
                type="text"
                required
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                placeholder="Ej: Operador UAS Nivel 1 - Básico"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código
              </label>
              <input
                type="text"
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                placeholder="ENAE/UAS/001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área de Formación *
              </label>
              <select
                required
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
              >
                <option value="">Seleccionar</option>
                {areas
                  .filter((a) => a.slug !== "todos")
                  .map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subárea
              </label>
              <input
                type="text"
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                placeholder="Ej: Operaciones RPAS"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nivel *
              </label>
              <select
                required
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
              >
                <option value="Básico">Básico</option>
                <option value="Intermedio">Intermedio</option>
                <option value="Avanzado">Avanzado</option>
                <option value="Especialización">Especialización</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duración *
              </label>
              <input
                type="text"
                required
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                placeholder="40 horas"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modalidad *
              </label>
              <select
                required
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
              >
                <option value="Presencial">Presencial</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Idioma
              </label>
              <select className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]">
                <option value="Español">Español</option>
                <option value="Inglés">Inglés</option>
                <option value="Español/Inglés">Español/Inglés</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción *
              </label>
              <textarea
                required
                rows={3}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                placeholder="Descripción breve del curso..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objetivo General
              </label>
              <textarea
                rows={3}
                className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                placeholder="Objetivo del curso..."
              />
            </div>
          </div>
        </div>

        {/* Objectives */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#003366] mb-4">
            Objetivos de Aprendizaje
          </h2>
          <div className="space-y-3">
            {objectives.map((obj, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-sm text-gray-400 mt-2.5 w-6 shrink-0">
                  {i + 1}.
                </span>
                <input
                  type="text"
                  value={obj}
                  onChange={(e) =>
                    updateField(setObjectives, i, e.target.value)
                  }
                  className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                  placeholder="Objetivo de aprendizaje"
                />
                {objectives.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeField(setObjectives, i)}
                    className="text-red-400 hover:text-red-600 px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addField(setObjectives)}
              className="text-sm text-[#0072CE] hover:underline"
            >
              + Agregar objetivo
            </button>
          </div>
        </div>

        {/* Modules */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#003366] mb-4">
            Módulos del Curso
          </h2>
          <div className="space-y-3">
            {modules.map((mod, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-sm text-gray-400 mt-2.5 w-6 shrink-0">
                  {i + 1}.
                </span>
                <input
                  type="text"
                  value={mod}
                  onChange={(e) =>
                    updateField(setModules, i, e.target.value)
                  }
                  className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"
                  placeholder="Nombre del módulo"
                />
                {modules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeField(setModules, i)}
                    className="text-red-400 hover:text-red-600 px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addField(setModules)}
              className="text-sm text-[#0072CE] hover:underline"
            >
              + Agregar módulo
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Link
            href="/admin/cursos"
            className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#0072CE] text-white rounded-lg hover:bg-[#005fa3] text-sm font-medium transition"
          >
            Guardar Curso
          </button>
        </div>
      </form>
    </div>
  );
}
