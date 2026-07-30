export const metadata = {
  title: "Política de Reembolso | ENAE",
  description:
    "Política de reembolso y devoluciones de la Escuela de Navegación Aérea (ENAE) para cursos presenciales, en vivo y de acceso digital online.",
};

export default function ReembolsosPage() {
  return (
    <>
      <section className="bg-[#003366] text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Política de Reembolso</h1>
          <p className="text-blue-200">Última actualización: Julio 2026</p>
        </div>
      </section>

      <section className="py-12 bg-[#F8F9FA]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8 prose prose-sm max-w-none text-gray-700">
            <h2 className="text-lg font-bold text-[#003366]">1. Alcance</h2>
            <p>
              Esta política aplica a todas las compras realizadas a la Escuela de Navegación Aérea SpA
              (&quot;ENAE&quot;) a través de <a href="https://www.enae.cl" className="text-[#0072CE]">www.enae.cl</a>,
              tanto para cursos presenciales o en vivo con fecha de inicio, como para el acceso a cursos
              online (contenido digital) en nuestra plataforma de alumnos.
            </p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">2. Cursos presenciales o en vivo (con fecha de inicio)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Las solicitudes de reembolso deben realizarse al menos <strong>10 días hábiles</strong> antes del inicio del curso, con reembolso del 100%.</li>
              <li>Las solicitudes con menos de 10 días hábiles de anticipación están sujetas a un cargo administrativo del <strong>30%</strong>.</li>
              <li>No se realizarán reembolsos una vez iniciado el curso.</li>
            </ul>

            <h2 className="text-lg font-bold text-[#003366] mt-8">3. Cursos online / acceso digital</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Dispones de un plazo de <strong>14 días</strong> desde la compra para solicitar el reembolso completo, <strong>siempre que no hayas accedido de forma sustancial al contenido</strong> (por ejemplo, completar módulos, descargar materiales o rendir evaluaciones).</li>
              <li>Una vez que el curso ha sido accedido sustancialmente o completado, o emitido el certificado, la compra no es reembolsable, por tratarse de contenido digital consumido.</li>
            </ul>

            <h2 className="text-lg font-bold text-[#003366] mt-8">4. Cancelación por parte de ENAE</h2>
            <p>
              Si ENAE cancela o reprograma un curso y no puedes asistir a la nueva fecha, se reembolsará el
              <strong> 100% </strong> del monto pagado, o podrás optar por un crédito para otro curso.
            </p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">5. Cómo solicitar un reembolso</h2>
            <p>
              Escríbenos a <a href="mailto:escuela@enae.cl" className="text-[#0072CE]">escuela@enae.cl</a> indicando
              tu nombre completo, el curso comprado, la fecha de compra y el correo con el que realizaste el pago.
              Confirmaremos la recepción y resolveremos tu solicitud dentro de los plazos indicados.
            </p>

            <h2 className="text-lg font-bold text-[#003366] mt-8">6. Medio y plazo de reembolso</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Los reembolsos se procesan por el <strong>mismo medio de pago</strong> utilizado en la compra.</li>
              <li>Los pagos nacionales (Chile) se procesan mediante <strong>Transbank WebPay</strong>.</li>
              <li>Los pagos internacionales se procesan a través de <strong>Paddle.com</strong>, nuestro Merchant of Record (comercio registrado). Para compras internacionales, el reembolso se gestiona a través de Paddle y puede solicitarse también respondiendo al recibo de compra emitido por Paddle.</li>
              <li>Una vez aprobado, el reembolso se emite dentro de <strong>5 a 10 días hábiles</strong>; el tiempo de acreditación en tu tarjeta o cuenta depende de tu banco o emisor.</li>
            </ul>

            <h2 className="text-lg font-bold text-[#003366] mt-8">7. Contacto</h2>
            <p>
              Para cualquier consulta sobre esta política, contáctanos en{" "}
              <a href="mailto:escuela@enae.cl" className="text-[#0072CE]">escuela@enae.cl</a> o al
              WhatsApp <strong>+56 9 5215 0764</strong>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
