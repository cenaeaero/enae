import Link from "next/link";

// Sello circular AOC 1521 - DGAC Chile (vector, estilo del footer)
function SealAoc() {
  return (
    <svg viewBox="0 0 96 96" className="w-16 h-16" role="img" aria-label="AOC 1521 - DGAC Chile">
      <title>Centro de instrucción autorizado - AOC 1521 - DGAC Chile</title>
      <circle cx="48" cy="48" r="45" fill="none" stroke="#93C5FD" strokeWidth="2" />
      <circle cx="48" cy="48" r="33" fill="none" stroke="#93C5FD" strokeWidth="0.75" />
      <defs>
        <path id="aocRing" d="M 48 87 a 39 39 0 1 1 0 -78 a 39 39 0 1 1 0 78" fill="none" />
      </defs>
      <text fontSize="6.5" fill="#93C5FD" letterSpacing="1">
        <textPath href="#aocRing" startOffset="50%" textAnchor="middle">CENTRO DE INSTRUCCIÓN AUTORIZADO</textPath>
      </text>
      <text x="48" y="44" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#DBEAFE">AOC</text>
      <text x="48" y="57" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#DBEAFE">1521</text>
      <text x="48" y="67" textAnchor="middle" fontSize="6.5" fill="#93C5FD" letterSpacing="0.5">DGAC CHILE</text>
      <text x="48" y="87" textAnchor="middle" fontSize="7" fill="#93C5FD">★</text>
    </svg>
  );
}

// Sello circular ISO 9001:2015 (vector, estilo del footer)
function SealIso() {
  return (
    <svg viewBox="0 0 96 96" className="w-16 h-16" role="img" aria-label="Certificación ISO 9001:2015">
      <title>ISO 9001:2015 - Sistema de Gestión de Calidad - Cert. N° ESC/QMS/G26/5904</title>
      <circle cx="48" cy="48" r="45" fill="none" stroke="#93C5FD" strokeWidth="2" />
      <circle cx="48" cy="48" r="33" fill="none" stroke="#93C5FD" strokeWidth="0.75" />
      <defs>
        <path id="isoRing" d="M 48 87 a 39 39 0 1 1 0 -78 a 39 39 0 1 1 0 78" fill="none" />
      </defs>
      <text fontSize="6.5" fill="#93C5FD" letterSpacing="1">
        <textPath href="#isoRing" startOffset="50%" textAnchor="middle">SISTEMA DE GESTIÓN DE CALIDAD</textPath>
      </text>
      <text x="48" y="42" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#DBEAFE">ISO</text>
      <text x="48" y="54" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#DBEAFE">9001:2015</text>
      <path d="M 42 60 l 4 4 l 8.5 -8" fill="none" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="48" y="87" textAnchor="middle" fontSize="7" fill="#93C5FD">★</text>
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#001d3d] text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/img/logo-enae.png"
                alt="ENAE Logo"
                className="w-11 h-11 rounded-full"
              />
              <span className="font-bold text-lg">ENAE</span>
            </div>
            <p className="text-blue-200 text-sm leading-relaxed">
              Escuela de Navegación Aérea. Formando a los aviadores del
              mañana desde el Aeródromo Eulogio Sánchez, Tobalaba.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <SealAoc />
              <SealIso />
            </div>
            <p className="text-blue-300/70 text-[11px] mt-2">
              AOC 1521 - DGAC Chile · ISO 9001:2015 Cert. N° ESC/QMS/G26/5904
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-blue-300">
              Formación
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/cursos"
                  className="text-blue-200 hover:text-white transition"
                >
                  Catálogo de Cursos
                </Link>
              </li>
              <li>
                <Link
                  href="/programas"
                  className="text-blue-200 hover:text-white transition"
                >
                  Programas
                </Link>
              </li>
              <li>
                <Link
                  href="/calendario"
                  className="text-blue-200 hover:text-white transition"
                >
                  Calendario 2026
                </Link>
              </li>
              <li>
                <Link
                  href="/admision"
                  className="text-blue-200 hover:text-white transition"
                >
                  Admisión
                </Link>
              </li>
            </ul>
          </div>

          {/* Institutional */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-blue-300">
              Institucional
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/institucional"
                  className="text-blue-200 hover:text-white transition"
                >
                  Sobre ENAE
                </Link>
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="text-blue-200 hover:text-white transition"
                >
                  Contacto
                </Link>
              </li>
              <li>
                <Link
                  href="/tpems"
                  className="text-blue-200 hover:text-white transition"
                >
                  Plataforma LMS
                </Link>
              </li>
              <li>
                <a
                  href="/verificar"
                  className="text-blue-200 hover:text-white transition"
                >
                  Verificar Diploma
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-blue-300">
              Contacto
            </h3>
            <ul className="space-y-3 text-sm text-blue-200">
              <li>
                <a href="mailto:escuela@enae.cl" className="hover:text-white transition">
                  escuela@enae.cl
                </a>
              </li>
              <li>
                <a href="https://wa.me/56952150764" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  +56 9 5215 0764
                </a>
              </li>
              <li>
                <a href="https://wa.me/56967089439" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  +56 9 6708 9439
                </a>
              </li>
              <li className="pt-2">
                <span className="block text-white font-medium">Santiago, Chile</span>
                Aeródromo Eulogio Sánchez, Tobalaba
              </li>
              <li>
                <span className="block text-white font-medium">Bogotá, Colombia</span>
              </li>
              <li>
                <span className="block text-white font-medium">Madrid, España</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-blue-300">
          <p>&copy; {new Date().getFullYear()} ENAE - Escuela de Navegación Aérea SpA. Todos los derechos reservados.</p>
          <div className="flex gap-4 mt-3 md:mt-0">
            <Link href="/privacidad" className="hover:text-white transition">
              Política de Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-white transition">
              Términos de Uso
            </Link>
            <Link href="/reembolsos" className="hover:text-white transition">
              Reembolsos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
