import Link from "next/link";

const steps = [
  {
    num: 1,
    title: "Explora el catálogo",
    description: "Revisa nuestros cursos y programas disponibles para encontrar el que mejor se adapte a tus objetivos.",
  },
  {
    num: 2,
    title: "Completa la solicitud",
    description: "Llena el formulario de postulación con tus datos personales y la selección de curso.",
  },
  {
    num: 3,
    title: "Documentación",
    description: "Envía la documentación requerida: cédula de identidad, certificado de estudios y certificado médico (según corresponda).",
  },
  {
    num: 4,
    title: "Matrícula",
    description: "Una vez aprobada tu postulación, completa el proceso de matrícula y pago. Consulta por becas y financiamiento.",
  },
];

const faqs = [
  {
    q: "¿Qué requisitos necesito para postular?",
    a: "Ser mayor de 18 años, tener educación media completa y certificado médico clase 1 o 2 según el programa. Para cursos UAS no se requiere experiencia previa.",
  },
  {
    q: "¿Ofrecen becas o financiamiento?",
    a: "Sí, contamos con convenios institucionales, becas parciales por mérito y opciones de pago en cuotas. Consulta disponibilidad al momento de postular.",
  },
  {
    q: "¿Los certificados tienen validez internacional?",
    a: "Nuestros programas están alineados con estándares OACI. La certificación DGAC tiene validez en Chile y puede ser convalidada en otros países según acuerdos bilaterales.",
  },
  {
    q: "¿Puedo tomar cursos desde otro país?",
    a: "Sí, ofrecemos cursos en modalidad online e híbrida. También puedes asistir a nuestras sedes en Bogotá o Madrid para los cursos presenciales.",
  },
];

export default function AdmisionPage() {
  return (
    <>
      <section className="bg-[#003366] text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Admisión</h1>
          <p className="text-blue-200">
            Únete a ENAE y comienza tu carrera en aviación
          </p>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[#003366] text-center mb-12">
            Proceso de Admisión
          </h2>
          <div className="space-y-8">
            {steps.map((step, idx) => (
              <div key={step.num} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-[#003366] text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0">
                    {step.num}
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-2" />
                  )}
                </div>
                <div className="pb-8">
                  <h3 className="text-lg font-semibold text-[#003366] mb-1">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[#003366] to-[#004B87] text-white py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">¿Listo para postular?</h2>
          <p className="text-blue-200 mb-8">
            Completa el formulario de contacto y nuestro equipo de admisión se
            comunicará contigo.
          </p>
          <Link
            href="/contacto"
            className="inline-flex items-center px-8 py-3.5 bg-white text-[#003366] font-semibold rounded-lg hover:bg-blue-50 transition"
          >
            Solicitar Información
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-[#F8F9FA]">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[#003366] text-center mb-10">
            Preguntas Frecuentes
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="bg-white rounded-lg p-6 border border-gray-200"
              >
                <h3 className="font-semibold text-[#003366] mb-2">{faq.q}</h3>
                <p className="text-gray-600 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
