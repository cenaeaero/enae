export default function TerminosPage() {
  return (
    <>
      <section className="bg-[#003366] text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Términos de Uso</h1>
          <p className="text-blue-200">Última actualización: Marzo 2026</p>
        </div>
      </section>

      <section className="py-12 bg-[#F8F9FA]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8 prose prose-sm max-w-none text-gray-700">
            <h2 className="text-lg font-bold text-[#003366]">1. Aceptación de los Términos</h2>
            <p>Al acceder y utilizar el sitio web de la Escuela de Navegación Aérea SpA (&quot;ENAE&quot;) y su plataforma de gestión de cursos (TPEMS), usted acepta estar sujeto a estos Términos de Uso. Si no está de acuerdo con alguno de estos términos, no utilice este sitio.</p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">2. Descripción del Servicio</h2>
            <p>ENAE proporciona servicios de formación aeronáutica a través de:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Catálogo de cursos y programas de formación</li>
              <li>Sistema de inscripción y pago en línea</li>
              <li>Portal de alumnos (TPEMS) para acceso a contenidos y seguimiento de progreso</li>
              <li>Sistema de evaluación y certificación</li>
            </ul>

            <h2 className="text-lg font-bold text-[#003366] mt-8">3. Registro y Cuenta de Usuario</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Al registrarse en un curso, se creará una cuenta de acceso al portal TPEMS</li>
              <li>Usted es responsable de mantener la confidencialidad de sus credenciales</li>
              <li>Debe proporcionar información veraz y actualizada</li>
              <li>ENAE se reserva el derecho de suspender cuentas que incumplan estos términos</li>
            </ul>

            <h2 className="text-lg font-bold text-[#003366] mt-8">4. Inscripción y Pagos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>La inscripción en un curso se confirma una vez procesado el pago correspondiente</li>
              <li>Los pagos se procesan a través de Transbank WebPay de forma segura</li>
              <li>Las tarifas están expresadas en la moneda indicada para cada sesión</li>
              <li>ENAE emitirá los documentos tributarios correspondientes</li>
            </ul>

            <h2 className="text-lg font-bold text-[#003366] mt-8">5. Política de Devoluciones</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Las solicitudes de devolución deben realizarse al menos 10 días hábiles antes del inicio del curso</li>
              <li>Devoluciones solicitadas con menos de 10 días de anticipación están sujetas a un cargo del 30%</li>
              <li>No se realizarán devoluciones una vez iniciado el curso</li>
              <li>En caso de cancelación del curso por parte de ENAE, se reembolsará el 100% del monto pagado</li>
              <li>Las devoluciones se procesarán por el mismo medio de pago utilizado</li>
            </ul>

            <h2 className="text-lg font-bold text-[#003366] mt-8">6. Propiedad Intelectual</h2>
            <p>Todo el contenido del sitio y los materiales de los cursos (textos, videos, presentaciones, evaluaciones) son propiedad de ENAE o de sus licenciantes. Queda prohibida su reproducción, distribución o comunicación pública sin autorización expresa.</p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">7. Obligaciones del Alumno</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Cumplir con los requisitos de asistencia y evaluación de cada curso</li>
              <li>No compartir credenciales de acceso con terceros</li>
              <li>No grabar ni distribuir el contenido de las clases sin autorización</li>
              <li>Mantener un comportamiento respetuoso en las actividades del curso</li>
              <li>Completar las encuestas de evaluación al finalizar cada curso</li>
            </ul>

            <h2 className="text-lg font-bold text-[#003366] mt-8">8. Certificación</h2>
            <p>La emisión de certificados está sujeta al cumplimiento de los requisitos académicos establecidos para cada curso, incluyendo asistencia mínima y aprobación de evaluaciones. Los certificados emitidos por ENAE están respaldados por la autorización AOC 1521 de la DGAC Chile.</p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">9. Limitación de Responsabilidad</h2>
            <p>ENAE no será responsable por daños indirectos derivados del uso de la plataforma, interrupciones temporales del servicio, o decisiones tomadas con base en los contenidos de formación.</p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">10. Legislación Aplicable</h2>
            <p>Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia será sometida a los tribunales ordinarios de la ciudad de Santiago.</p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">11. Contacto</h2>
            <p>Para consultas sobre estos términos, contacte a <a href="mailto:escuela@enae.cl" className="text-[#0072CE]">escuela@enae.cl</a>.</p>
          </div>
        </div>
      </section>
    </>
  );
}
