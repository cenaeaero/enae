import Link from "next/link";

const departments = [
  {
    name: "ATM & Navegación",
    description:
      "Formación en control de tránsito aéreo, comunicaciones aeronáuticas y sistemas de navegación.",
    icon: "🗼",
  },
  {
    name: "UAS/RPAS",
    description:
      "Programas de certificación para operadores de sistemas aéreos no tripulados en tres niveles.",
    icon: "🛩️",
  },
  {
    name: "Seguridad/AVSEC",
    description:
      "Seguridad aeroportuaria, mercancías peligrosas y cumplimiento regulatorio Anexo 17 OACI.",
    icon: "🛡️",
  },
  {
    name: "Simuladores",
    description:
      "Entrenamiento práctico en simuladores de torre de control y operaciones RPAS.",
    icon: "🖥️",
  },
  {
    name: "Safety & Factores Humanos",
    description:
      "Gestión de seguridad operacional (SMS), investigación de accidentes y CRM.",
    icon: "⚕️",
  },
  {
    name: "Gestión Aeronáutica",
    description:
      "Auditoría de calidad, gestión de proyectos y administración de organizaciones aeronáuticas.",
    icon: "📋",
  },
];

export default function InstitucionalPage() {
  return (
    <>
      <section className="bg-[#003366] text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Sobre ENAE</h1>
          <p className="text-blue-200">
            Escuela de Navegación Aérea - Formando aviadores desde Chile
          </p>
        </div>
      </section>

      {/* About */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-[#003366] mb-6">
              Formando a los Aviadores del Mañana
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              ENAE es una escuela de formación aeronáutica certificada por la
              Dirección General de Aeronáutica Civil (DGAC) bajo el AOC 1521.
              Desde nuestras instalaciones en el Aeródromo Eulogio Sánchez
              (Tobalaba), Santiago de Chile, ofrecemos programas de formación
              profesional en aviación con un enfoque práctico y orientado a la
              industria.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              A diferencia de la formación tradicional en aula, nuestros
              estudiantes aprenden dentro de un aeródromo activo, con acceso
              directo a pistas de vuelo, hangares de simulación y zonas de
              operación RPAS. Esta inmersión en el entorno aeronáutico real
              garantiza profesionales preparados para los desafíos de la
              industria.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Con presencia en Santiago (Chile), Bogotá (Colombia) y Madrid
              (España), ENAE forma profesionales aeronáuticos con estándares
              internacionales alineados con las recomendaciones de la OACI.
            </p>
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="py-16 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[#003366] text-center mb-10">
            Departamentos Académicos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <div
                key={dept.name}
                className="bg-white rounded-lg p-6 border border-gray-200 hover:border-[#0072CE] hover:shadow-md transition"
              >
                <div className="text-3xl mb-3">{dept.icon}</div>
                <h3 className="text-lg font-semibold text-[#003366] mb-2">
                  {dept.name}
                </h3>
                <p className="text-sm text-gray-600">{dept.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-[#003366] mb-10">
            Certificaciones y Reconocimientos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏛️</span>
              </div>
              <h3 className="font-semibold text-[#003366] mb-2">DGAC Chile</h3>
              <p className="text-sm text-gray-600">
                Certificado AOC 1521 - Centro de instrucción autorizado
              </p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🌐</span>
              </div>
              <h3 className="font-semibold text-[#003366] mb-2">
                Estándares OACI
              </h3>
              <p className="text-sm text-gray-600">
                Programas alineados con las recomendaciones de la Organización de
                Aviación Civil Internacional
              </p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎓</span>
              </div>
              <h3 className="font-semibold text-[#003366] mb-2">
                Formación Práctica
              </h3>
              <p className="text-sm text-gray-600">
                Entrenamiento en aeródromo activo con acceso a pista, simuladores
                y zona de vuelo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#003366] text-white py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">¿Quieres ser parte de ENAE?</h2>
          <p className="text-blue-200 mb-6">
            Conoce nuestros procesos de admisión y postula a nuestros programas
          </p>
          <Link
            href="/admision"
            className="inline-flex items-center px-8 py-3 bg-white text-[#003366] font-semibold rounded-lg hover:bg-blue-50 transition"
          >
            Información de Admisión
          </Link>
        </div>
      </section>
    </>
  );
}
