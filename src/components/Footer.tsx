import Link from "next/link";

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
            <p className="text-blue-300 text-xs mt-3">AOC 1521 - DGAC Chile</p>
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
                <a
                  href="https://plataforma.enae.cl"
                  target="_blank"
                  rel="noopener"
                  className="text-blue-200 hover:text-white transition"
                >
                  Plataforma LMS
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
            <Link href="/contacto" className="hover:text-white transition">
              Política de Privacidad
            </Link>
            <Link href="/contacto" className="hover:text-white transition">
              Términos de Uso
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
