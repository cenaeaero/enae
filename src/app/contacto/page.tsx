export default function ContactoPage() {
  return (
    <>
      <section className="bg-[#003366] text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Contacto</h1>
          <p className="text-blue-200">
            Estamos aquí para resolver tus dudas sobre nuestros programas
          </p>
        </div>
      </section>

      <section className="py-16 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
              <h2 className="text-xl font-bold text-[#003366] mb-6">
                Solicitar Información
              </h2>
              <form className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apellido
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
                      placeholder="Tu apellido"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Curso de interés
                  </label>
                  <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0072CE] focus:border-transparent text-gray-600">
                    <option>Seleccionar curso</option>
                    <option>Operador UAS Nivel 1 - Básico</option>
                    <option>Operador UAS Nivel 2 - Industrial</option>
                    <option>Operador UAS Nivel 3 - Profesional</option>
                    <option>Radiotelefonía Aeronáutica</option>
                    <option>Seguridad de la Aviación (AVSEC)</option>
                    <option>SMS - Seguridad Operacional</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mensaje
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0072CE] focus:border-transparent"
                    placeholder="¿En qué podemos ayudarte?"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-[#003366] text-white font-semibold rounded-lg hover:bg-[#004B87] transition"
                >
                  Enviar Consulta
                </button>
              </form>
            </div>

            {/* Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-[#003366] mb-6">
                  Información de Contacto
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <svg
                        className="w-5 h-5 text-[#0072CE]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-[#003366]">Dirección</h3>
                      <p className="text-gray-600 text-sm">
                        Aeródromo Eulogio Sánchez, Tobalaba
                        <br />
                        Santiago, Chile
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <svg
                        className="w-5 h-5 text-[#0072CE]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-[#003366]">Email</h3>
                      <p className="text-gray-600 text-sm">
                        info@enae.cl
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <svg
                        className="w-5 h-5 text-[#0072CE]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-[#003366]">Horario</h3>
                      <p className="text-gray-600 text-sm">
                        Lunes a Viernes: 09:00 - 18:00
                        <br />
                        Sábado: 09:00 - 13:00
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Locations */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-[#003366] mb-4">
                  Nuestras Sedes
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      city: "Santiago, Chile",
                      flag: "🇨🇱",
                      detail: "Sede principal - Aeródromo Tobalaba",
                    },
                    {
                      city: "Bogotá, Colombia",
                      flag: "🇨🇴",
                      detail: "Centro regional andino",
                    },
                    {
                      city: "Madrid, España",
                      flag: "🇪🇸",
                      detail: "Centro europeo",
                    },
                  ].map((loc) => (
                    <div key={loc.city} className="flex items-center gap-3">
                      <span className="text-2xl">{loc.flag}</span>
                      <div>
                        <div className="font-medium text-sm text-[#003366]">
                          {loc.city}
                        </div>
                        <div className="text-xs text-gray-500">{loc.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
