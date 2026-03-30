import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_USER || "noreply@enae.cl";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@enae.cl";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function sendStudentCredentials(
  email: string,
  password: string,
  studentName: string,
  courseName: string
) {
  await transporter.sendMail({
    from: `"ENAE Training" <${FROM}>`,
    to: email,
    subject: `Bienvenido a ENAE - Credenciales de acceso`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003366; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ENAE TPEMS</h1>
          <p style="color: #93C5FD; margin: 5px 0 0; font-size: 12px;">Training Programme Electronic Management System</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #003366;">Hola ${studentName},</h2>
          <p>Tu registro en el curso <strong>${courseName}</strong> ha sido recibido exitosamente.</p>
          <p>A continuacion tus credenciales de acceso al portal de alumnos:</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Contrasena:</strong> ${password}</p>
          </div>
          <p>Para completar tu inscripcion, ingresa al portal y realiza el pago del curso:</p>
          <a href="${SITE_URL}/tpems" style="display: inline-block; background: #0072CE; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Acceder al Portal</a>
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Si tienes dudas, contactanos en <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p>
        </div>
        <div style="background: #001d3d; padding: 15px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegacion Aerea | AOC 1521 DGAC</p>
        </div>
      </div>
    `,
  });
}

export async function sendAdminRegistrationNotification(
  studentName: string,
  studentEmail: string,
  courseName: string
) {
  await transporter.sendMail({
    from: `"ENAE Sistema" <${FROM}>`,
    to: ADMIN_EMAIL,
    subject: `Nuevo registro: ${studentName} - ${courseName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #003366;">Nuevo Registro de Alumno</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Alumno:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${studentName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${studentEmail}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Curso:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${courseName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Estado:</td><td style="padding: 8px;"><span style="background: #FEF3C7; color: #92400E; padding: 2px 8px; border-radius: 10px; font-size: 13px;">Pendiente de pago</span></td></tr>
        </table>
        <p style="margin-top: 15px;"><a href="${SITE_URL}/admin/registros" style="color: #0072CE;">Ver en panel admin</a></p>
      </div>
    `,
  });
}

export async function sendAdminPaymentNotification(
  studentName: string,
  studentEmail: string,
  courseName: string,
  amount: number
) {
  await transporter.sendMail({
    from: `"ENAE Sistema" <${FROM}>`,
    to: ADMIN_EMAIL,
    subject: `Pago recibido: ${studentName} - ${courseName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #003366;">Pago Recibido</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Alumno:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${studentName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${studentEmail}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Curso:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${courseName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Monto:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">$${amount.toLocaleString("es-CL")} CLP</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Estado:</td><td style="padding: 8px;"><span style="background: #D1FAE5; color: #065F46; padding: 2px 8px; border-radius: 10px; font-size: 13px;">Pagado</span></td></tr>
        </table>
        <p style="margin-top: 15px;"><a href="${SITE_URL}/admin/registros" style="color: #0072CE;">Ver en panel admin</a></p>
      </div>
    `,
  });
}

export async function sendStudentPaymentReceipt(
  email: string,
  studentName: string,
  courseName: string,
  transaction: {
    buyOrder: string;
    amount: number;
    cardNumber: string;
    authorizationCode: string;
    installments: number;
    date: string;
  }
) {
  const formattedAmount = "$" + transaction.amount.toLocaleString("es-CL");
  const formattedDate = new Date(transaction.date).toLocaleString("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
  });

  await transporter.sendMail({
    from: '"ENAE Training" <' + FROM + ">",
    to: email,
    subject: "Comprobante de Pago - " + courseName,
    html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
      '<div style="background: #003366; padding: 20px; text-align: center;">' +
      '<h1 style="color: white; margin: 0; font-size: 24px;">ENAE TPEMS</h1>' +
      '<p style="color: #93C5FD; margin: 5px 0 0; font-size: 12px;">Comprobante de Pago</p>' +
      "</div>" +
      '<div style="padding: 30px; background: #f8f9fa;">' +
      '<h2 style="color: #003366;">Hola ' + studentName + ",</h2>" +
      "<p>Tu pago por el curso <strong>" + courseName + "</strong> ha sido procesado exitosamente.</p>" +
      '<div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 20px 0;">' +
      '<div style="background: #003366; color: white; padding: 10px 16px; font-size: 14px; font-weight: bold;">Detalle de la Transaccion</div>' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 10px 16px; color: #6b7280; font-size: 13px;">Orden de compra</td><td style="padding: 10px 16px; text-align: right; font-family: monospace; font-size: 13px;">' + transaction.buyOrder + "</td></tr>" +
      '<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 10px 16px; color: #6b7280; font-size: 13px;">Monto</td><td style="padding: 10px 16px; text-align: right; font-weight: bold; font-size: 14px;">' + formattedAmount + " CLP</td></tr>" +
      '<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 10px 16px; color: #6b7280; font-size: 13px;">Tarjeta</td><td style="padding: 10px 16px; text-align: right; font-family: monospace; font-size: 13px;">**** **** **** ' + transaction.cardNumber + "</td></tr>" +
      '<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 10px 16px; color: #6b7280; font-size: 13px;">Codigo autorizacion</td><td style="padding: 10px 16px; text-align: right; font-family: monospace; font-size: 13px;">' + transaction.authorizationCode + "</td></tr>" +
      '<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 10px 16px; color: #6b7280; font-size: 13px;">Fecha</td><td style="padding: 10px 16px; text-align: right; font-size: 13px;">' + formattedDate + "</td></tr>" +
      '<tr><td style="padding: 10px 16px; color: #6b7280; font-size: 13px;">Estado</td><td style="padding: 10px 16px; text-align: right;"><span style="background: #D1FAE5; color: #065F46; padding: 2px 10px; border-radius: 10px; font-size: 12px;">Aprobado</span></td></tr>' +
      "</table></div>" +
      '<p>Puedes ver tus transacciones en el <a href="' + SITE_URL + '/tpems" style="color: #0072CE;">portal de alumnos</a>.</p>' +
      '<p style="color: #6b7280; font-size: 13px; margin-top: 20px;">Si tienes dudas, contactanos en <a href="mailto:' + ADMIN_EMAIL + '">' + ADMIN_EMAIL + "</a></p>" +
      "</div>" +
      '<div style="background: #001d3d; padding: 15px; text-align: center;">' +
      '<p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegacion Aerea | AOC 1521 DGAC</p>' +
      "</div></div>",
  });
}
