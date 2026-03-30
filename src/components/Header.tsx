"use client";

import Link from "next/link";
import { useState } from "react";

const trainingAreas = [
  { name: "ATM & Navegación", href: "/cursos?area=atm-navegacion" },
  { name: "UAS/RPAS", href: "/cursos?area=uas-rpas" },
  { name: "Seguridad/AVSEC", href: "/cursos?area=seguridad-avsec" },
  { name: "Simuladores", href: "/cursos?area=simuladores" },
  { name: "Safety & Factores Humanos", href: "/cursos?area=safety-ffhh" },
  { name: "Gestión Aeronáutica", href: "/cursos?area=gestion-aeronautica" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);

  return (
    <header className="bg-[#003366] text-white shadow-lg sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-[#001d3d] text-sm">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex justify-between items-center">
          <span className="text-blue-200">
            Escuela de Navegación Aérea | AOC 1521 DGAC
          </span>
          <div className="hidden md:flex gap-4 text-blue-200">
            <Link href="/admision" className="hover:text-white transition">
              Admisión
            </Link>
            <Link href="/tpems/login" className="hover:text-white transition">
              Portal Alumno
            </Link>
            <a
              href="https://plataforma.enae.cl"
              target="_blank"
              rel="noopener"
              className="hover:text-white transition"
            >
              Plataforma
            </a>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <img
              src="/img/logo-enae.png"
              alt="ENAE Logo"
              className="w-11 h-11 rounded-full"
            />
            <div className="hidden sm:block">
              <span className="font-bold text-lg tracking-wide">ENAE</span>
              <span className="block text-xs text-blue-200 -mt-0.5">
                Training Catalogue
              </span>
            </div>
          </Link>

          {/* Desktop menu */}
          <div className="hidden lg:flex items-center gap-1">
            <Link
              href="/"
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-[#004B87] transition"
            >
              Inicio
            </Link>

            {/* Training areas dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setAreasOpen(true)}
              onMouseLeave={() => setAreasOpen(false)}
            >
              <button className="px-3 py-2 rounded-md text-sm font-medium hover:bg-[#004B87] transition flex items-center gap-1">
                Áreas de Formación
                <svg
                  className={`w-4 h-4 transition-transform ${areasOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {areasOpen && (
                <div className="absolute top-full left-0 mt-0 w-64 bg-white rounded-b-lg shadow-xl py-2 border-t-2 border-[#0072CE]">
                  {trainingAreas.map((area) => (
                    <Link
                      key={area.href}
                      href={area.href}
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#003366] transition"
                    >
                      {area.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/cursos"
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-[#004B87] transition"
            >
              Cursos
            </Link>
            <Link
              href="/calendario"
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-[#004B87] transition"
            >
              Calendario
            </Link>
            <Link
              href="/programas"
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-[#004B87] transition"
            >
              Programas
            </Link>
            <Link
              href="/institucional"
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-[#004B87] transition"
            >
              Institucional
            </Link>
            <Link
              href="/contacto"
              className="px-3 py-2 rounded-md text-sm font-medium bg-[#0072CE] hover:bg-[#005fa3] transition rounded-full ml-2"
            >
              Contacto
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 rounded-md hover:bg-[#004B87]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden pb-4 border-t border-[#004B87]">
            <Link
              href="/"
              className="block px-3 py-2 text-sm hover:bg-[#004B87] rounded-md"
            >
              Inicio
            </Link>
            <div className="px-3 py-2 text-xs font-semibold text-blue-300 uppercase tracking-wider mt-2">
              Áreas de Formación
            </div>
            {trainingAreas.map((area) => (
              <Link
                key={area.href}
                href={area.href}
                className="block px-6 py-2 text-sm hover:bg-[#004B87] rounded-md"
              >
                {area.name}
              </Link>
            ))}
            <Link
              href="/cursos"
              className="block px-3 py-2 text-sm hover:bg-[#004B87] rounded-md mt-2"
            >
              Cursos
            </Link>
            <Link
              href="/calendario"
              className="block px-3 py-2 text-sm hover:bg-[#004B87] rounded-md"
            >
              Calendario
            </Link>
            <Link
              href="/programas"
              className="block px-3 py-2 text-sm hover:bg-[#004B87] rounded-md"
            >
              Programas
            </Link>
            <Link
              href="/institucional"
              className="block px-3 py-2 text-sm hover:bg-[#004B87] rounded-md"
            >
              Institucional
            </Link>
            <Link
              href="/contacto"
              className="block px-3 py-2 text-sm hover:bg-[#004B87] rounded-md"
            >
              Contacto
            </Link>
            <Link
              href="/admision"
              className="block px-3 py-2 text-sm hover:bg-[#004B87] rounded-md"
            >
              Admisión
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
