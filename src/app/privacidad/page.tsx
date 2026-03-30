export default function PrivacidadPage() {
  return (
    <>
      <section className="bg-[#003366] text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Política de Privacidad</h1>
          <p className="text-blue-200">Última actualización: Marzo 2026</p>
        </div>
      </section>

      <section className="py-12 bg-[#F8F9FA]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8 prose prose-sm max-w-none text-gray-700">
            <h2 className="text-lg font-bold text-[#003366]">1. Responsable del Tratamiento</h2>
            <p>Escuela de Navegación Aérea SpA (en adelante, &quot;ENAE&quot;), con domicilio en Aeródromo Eulogio Sánchez, Tobalaba, Santiago, Chile, es responsable del tratamiento de los datos personales recogidos a través de este sitio web.</p>
            <p>Email de contacto: <a href="mailto:escuela@enae.cl" className="text-[#0072CE]">escuela@enae.cl</a></p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">2. Datos Personales Recopilados</h2>
            <p>Recopilamos los siguientes datos personales cuando usted se registra en nuestros cursos o utiliza nuestros servicios:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Datos de identificación: nombre, apellido, RUT/DNI, título</li>
              <li>Datos de contacto: email, teléfono, dirección postal</li>
              <li>Datos laborales: cargo, organización, tipo de organización</li>
              <li>Datos del supervisor (cuando aplique)</li>
              <li>Datos de facturación</li>
              <li>Datos de pago: procesados por Transbank (no almacenamos números completos de tarjeta)</li>
              <li>Datos de uso: progreso en cursos, respuestas a encuestas, mensajes</li>
            </ul>

            <h2 className="text-lg font-bold text-[#003366] mt-8">3. Finalidad del Tratamiento</h2>
            <p>Sus datos personales son tratados con las siguientes finalidades:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gestión de inscripciones y matrículas en cursos de formación</li>
              <li>Procesamiento de pagos a través de Transbank WebPay</li>
              <li>Emisión de certificados y constancias de formación</li>
              <li>Comunicación sobre el estado de sus cursos y actividades</li>
              <li>Envío de información sobre nuevos programas de formación</li>
              <li>Cumplimiento de obligaciones legales y regulatorias ante la DGAC</li>
              <li>Mejora de nuestros servicios educativos mediante encuestas de satisfacción</li>
            </ul>

            <h2 className="text-lg font-bold text-[#003366] mt-8">4. Base Legal</h2>
            <p>El tratamiento de sus datos se fundamenta en:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>El consentimiento otorgado al registrarse en nuestros cursos</li>
              <li>La ejecución del contrato de prestación de servicios educativos</li>
              <li>El cumplimiento de obligaciones legales (Ley 19.628 sobre Protección de la Vida Privada)</li>
              <li>El interés legítimo de ENAE para mejorar sus servicios</li>
            </ul>

            <h2 className="text-lg font-bold text-[#003366] mt-8">5. Compartición de Datos</h2>
            <p>Sus datos personales podrán ser compartidos con:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Transbank: para el procesamiento de pagos</li>
              <li>Supabase: como proveedor de infraestructura de base de datos</li>
              <li>Dirección General de Aeronáutica Civil (DGAC): cuando sea requerido por regulación</li>
              <li>Instructores asignados a sus cursos: para la gestión académica</li>
            </ul>
            <p>No vendemos ni compartimos sus datos con terceros para fines comerciales.</p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">6. Derechos del Titular</h2>
            <p>Usted tiene derecho a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Acceder a sus datos personales</li>
              <li>Rectificar datos inexactos o incompletos</li>
              <li>Solicitar la eliminación de sus datos</li>
              <li>Oponerse al tratamiento de sus datos</li>
              <li>Solicitar la portabilidad de sus datos</li>
            </ul>
            <p>Para ejercer estos derechos, contacte a <a href="mailto:escuela@enae.cl" className="text-[#0072CE]">escuela@enae.cl</a>.</p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">7. Seguridad</h2>
            <p>Implementamos medidas técnicas y organizativas para proteger sus datos, incluyendo cifrado de datos en tránsito (HTTPS), control de acceso basado en roles, y almacenamiento seguro en infraestructura certificada.</p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">8. Retención de Datos</h2>
            <p>Sus datos serán conservados durante el tiempo necesario para cumplir con las finalidades descritas y las obligaciones legales aplicables. Los registros académicos se conservan de forma indefinida conforme a la regulación aeronáutica vigente.</p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">9. Cookies</h2>
            <p>Este sitio utiliza cookies esenciales para el funcionamiento del portal de alumnos y cookies de autenticación. Consulte nuestra política de cookies para más información.</p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">10. Modificaciones</h2>
            <p>ENAE se reserva el derecho de modificar esta política de privacidad. Cualquier cambio será publicado en esta página con la fecha de actualización correspondiente.</p>
          </div>
        </div>
      </section>
    </>
  );
}
