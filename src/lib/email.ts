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

const FROM = process.env.SMTP_USER || "escuela@enae.cl";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "escuela@enae.cl";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function sendStudentCredentials(
  email: string,
  password: string,
  studentName: string,
  courseName: string,
  isFree: boolean = false
) {
  const ctaText = isFree
    ? "Tu inscripcion esta confirmada. Ingresa al portal para comenzar el curso:"
    : "Para completar tu inscripcion, ingresa al portal y realiza el pago del curso:";
  const ctaLabel = isFree ? "Acceder al Curso" : "Acceder al Portal";
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
          <p>${ctaText}</p>
          <a href="${SITE_URL}/tpems/login" style="display: inline-block; background: #0072CE; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">${ctaLabel}</a>
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Si tienes dudas, contactanos en <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p>
        </div>
        <div style="background: #001d3d; padding: 15px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegacion Aerea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
        </div>
      </div>
    `,
  });
}

export async function sendPaymentReminder(
  email: string,
  studentName: string,
  courseName: string,
  registrationId: string,
  amount: string | null
) {
  const amountText = amount || "tu curso";
  await transporter.sendMail({
    from: `"ENAE - Escuela de Navegacion Aerea" <${FROM}>`,
    to: email,
    replyTo: ADMIN_EMAIL,
    subject: `Te estamos esperando en ${courseName} - ENAE`,
    text: `Hola ${studentName},

Nos entusiasma muchisimo que hayas elegido formarte con nosotros en el curso "${courseName}".

Para que puedas comenzar cuanto antes, te recordamos que aun tienes pendiente el pago del curso. Puedes realizarlo directamente desde nuestra plataforma, es rapido y seguro:

${SITE_URL}/tpems

Una vez confirmado tu pago, tendras acceso inmediato al material del curso, los videos, las actividades y todas las herramientas que hemos preparado para ti.

Si tienes alguna duda o necesitas ayuda, no dudes en escribirnos. Estamos aqui para apoyarte.

Saludos cordiales,
Equipo ENAE
${ADMIN_EMAIL}
`,
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Te esperamos en ${courseName}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f4;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f4;padding:20px 0;">
<tr>
<td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color:#ffffff;border-collapse:collapse;max-width:600px;">
<tr>
<td style="background-color:#003366;padding:30px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:normal;">Estamos ansiosos de verte comenzar</h1>
<p style="color:#93C5FD;margin:5px 0 0;font-size:13px;">Escuela de Navegacion Aerea</p>
</td>
</tr>
<tr>
<td style="padding:35px 30px;color:#333333;line-height:1.6;">
<p style="margin:0 0 15px;font-size:16px;">Hola <strong>${studentName}</strong>,</p>
<p style="margin:0 0 20px;font-size:15px;">Nos entusiasma muchisimo que hayas elegido formarte con nosotros. Tu inscripcion ha sido recibida exitosamente.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:25px 0;">
<tr>
<td style="background-color:#f0f9ff;padding:20px;border-left:3px solid #0072CE;">
<p style="margin:0 0 5px;color:#003366;font-size:17px;font-weight:bold;">${courseName}</p>
<p style="margin:0;color:#666666;font-size:14px;">Monto: <strong>${amountText}</strong></p>
</td>
</tr>
</table>

<p style="margin:20px 0 15px;font-size:15px;">Para que puedas comenzar cuanto antes, te recordamos que aun tienes pendiente el pago del curso. Puedes realizarlo directamente desde nuestra plataforma de forma rapida y segura.</p>

<p style="margin:20px 0;font-size:15px;">Una vez confirmado tu pago, tendras <strong>acceso inmediato</strong> al material, videos, actividades y todas las herramientas que hemos preparado para ti.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:30px 0;">
<tr>
<td align="center">
<a href="${SITE_URL}/tpems" style="display:inline-block;background:#E91E63;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Realizar Pago Ahora</a>
</td>
</tr>
</table>

<p style="margin:25px 0 10px;font-size:14px;color:#666;">Si tienes alguna duda o necesitas ayuda, no dudes en escribirnos. Estamos aqui para apoyarte.</p>

<p style="margin:15px 0 0;font-size:14px;">Saludos cordiales,</p>
<p style="margin:5px 0 0;font-size:14px;"><strong>Equipo ENAE</strong></p>
</td>
</tr>
<tr>
<td style="background-color:#f4f4f4;padding:20px 30px;text-align:center;font-size:12px;color:#888888;border-top:1px solid #e0e0e0;">
<p style="margin:0 0 5px;">Escuela de Navegacion Aerea SpA | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
<p style="margin:0;">Contacto: <a href="mailto:${ADMIN_EMAIL}" style="color:#003366;">${ADMIN_EMAIL}</a></p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`,
  });
}

export async function sendReturningStudentWelcome(
  email: string,
  studentName: string,
  courseName: string
) {
  await transporter.sendMail({
    from: `"ENAE Training" <${FROM}>`,
    to: email,
    subject: `Bienvenido de vuelta a ENAE - Nuevo curso: ${courseName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003366; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ENAE TPEMS</h1>
          <p style="color: #93C5FD; margin: 5px 0 0; font-size: 12px;">Training Programme Electronic Management System</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #003366;">Hola ${studentName},</h2>
          <p>Nos alegra que vuelvas a nuestras aulas. Te damos la mas cordial bienvenida a tu nuevo curso:</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="color: #003366; margin: 0 0 5px;">${courseName}</h3>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Este curso ha sido agregado a tu portal de alumnos</p>
          </div>
          <p>Accede con tus credenciales habituales — tu contrasena no ha cambiado:</p>
          <a href="${SITE_URL}/tpems/login" style="display: inline-block; background: #0072CE; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Acceder al Portal</a>
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Si tienes dudas, contactanos en <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p>
        </div>
        <div style="background: #001d3d; padding: 15px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegacion Aerea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
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
    currency?: string;
  }
) {
  const currency = transaction.currency || "CLP";
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
      '<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 10px 16px; color: #6b7280; font-size: 13px;">Monto</td><td style="padding: 10px 16px; text-align: right; font-weight: bold; font-size: 14px;">' + formattedAmount + " " + currency + "</td></tr>" +
      (transaction.cardNumber
        ? '<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 10px 16px; color: #6b7280; font-size: 13px;">Tarjeta</td><td style="padding: 10px 16px; text-align: right; font-family: monospace; font-size: 13px;">**** **** **** ' + transaction.cardNumber + "</td></tr>"
        : "") +
      (transaction.authorizationCode
        ? '<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 10px 16px; color: #6b7280; font-size: 13px;">Codigo autorizacion</td><td style="padding: 10px 16px; text-align: right; font-family: monospace; font-size: 13px;">' + transaction.authorizationCode + "</td></tr>"
        : "") +
      '<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 10px 16px; color: #6b7280; font-size: 13px;">Fecha</td><td style="padding: 10px 16px; text-align: right; font-size: 13px;">' + formattedDate + "</td></tr>" +
      '<tr><td style="padding: 10px 16px; color: #6b7280; font-size: 13px;">Estado</td><td style="padding: 10px 16px; text-align: right;"><span style="background: #D1FAE5; color: #065F46; padding: 2px 10px; border-radius: 10px; font-size: 12px;">Aprobado</span></td></tr>' +
      "</table></div>" +
      '<p>Puedes ver tus transacciones en el <a href="' + SITE_URL + '/tpems" style="color: #0072CE;">portal de alumnos</a>.</p>' +
      '<p style="color: #6b7280; font-size: 13px; margin-top: 20px;">Si tienes dudas, contactanos en <a href="mailto:' + ADMIN_EMAIL + '">' + ADMIN_EMAIL + "</a></p>" +
      "</div>" +
      '<div style="background: #001d3d; padding: 15px; text-align: center;">' +
      '<p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegacion Aerea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>' +
      "</div></div>",
  });
}

export async function sendAdminExamNotification(
  studentName: string,
  studentEmail: string,
  courseName: string,
  examName: string,
  score: number,
  passed: boolean,
  moduleName?: string | null,
  isFinalExam?: boolean,
  isDgacSimulator?: boolean
) {
  // Build exam type label
  let examTypeBadge = "";
  if (isDgacSimulator) {
    examTypeBadge = `<span style="background: #F3E8FF; color: #6B21A8; padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; margin-left: 6px;">Simulador DGAC</span>`;
  } else if (isFinalExam) {
    examTypeBadge = `<span style="background: #FEF3C7; color: #92400E; padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; margin-left: 6px;">Examen Final</span>`;
  } else {
    examTypeBadge = `<span style="background: #DBEAFE; color: #1E40AF; padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; margin-left: 6px;">Modulo</span>`;
  }

  const subjectPrefix = isDgacSimulator
    ? "Simulador DGAC"
    : isFinalExam
    ? "Examen Final"
    : "Examen de Modulo";

  await transporter.sendMail({
    from: `"ENAE Sistema" <${FROM}>`,
    to: ADMIN_EMAIL,
    subject: `${subjectPrefix} ${passed ? "aprobado" : "reprobado"}: ${studentName} - ${examName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #003366;">Resultado de Examen ${examTypeBadge}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Alumno:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${studentName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${studentEmail}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Curso:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${courseName}</td></tr>
          ${moduleName ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Modulo:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${moduleName}</td></tr>` : ""}
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Tipo:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${isDgacSimulator ? "Simulador Examen DGAC" : isFinalExam ? "Examen Final del Curso" : "Examen de Modulo"}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Examen:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${examName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Nota:</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; font-size: 18px;">${score}%</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Estado:</td><td style="padding: 8px;"><span style="background: ${passed ? "#D1FAE5" : "#FEE2E2"}; color: ${passed ? "#065F46" : "#991B1B"}; padding: 2px 8px; border-radius: 10px; font-size: 13px;">${passed ? "Aprobado" : "Reprobado"}</span></td></tr>
        </table>
        <p style="margin-top: 15px;"><a href="${SITE_URL}/admin/registros" style="color: #0072CE;">Ver en panel admin</a></p>
      </div>
    `,
  });
}

export async function sendStudentExamReset(
  email: string,
  studentName: string,
  courseName: string,
  examName: string
) {
  await transporter.sendMail({
    from: `"ENAE Training" <${FROM}>`,
    to: email,
    subject: `Examen habilitado nuevamente - ${courseName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003366; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ENAE TPEMS</h1>
          <p style="color: #93C5FD; margin: 5px 0 0; font-size: 12px;">Training Programme Electronic Management System</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #003366;">Hola ${studentName},</h2>
          <p>Tu examen <strong>${examName}</strong> del curso <strong>${courseName}</strong> ha sido reiniciado por el administrador.</p>
          <p>Ya puedes volver a rendir el examen ingresando al portal de alumnos:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${SITE_URL}/tpems/login" style="display: inline-block; background: #0072CE; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Acceder al Portal</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Si tienes dudas, contactanos en <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p>
        </div>
        <div style="background: #001d3d; padding: 15px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegacion Aerea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
        </div>
      </div>
    `,
  });
}

export async function sendStudentCourseAccess(
  email: string,
  studentName: string,
  courseName: string
) {
  await transporter.sendMail({
    from: `"ENAE Training" <${FROM}>`,
    to: email,
    subject: `Acceso al Curso - ${courseName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003366; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ENAE TPEMS</h1>
          <p style="color: #93C5FD; margin: 5px 0 0; font-size: 12px;">Training Programme Electronic Management System</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #003366;">Hola ${studentName},</h2>
          <p>Tu pago ha sido confirmado y ya puedes acceder al curso <strong>${courseName}</strong> en nuestra plataforma.</p>
          <p>Ingresa al portal de alumnos con tus credenciales habituales para iniciar tu formacion:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${SITE_URL}/tpems/login" style="display: inline-block; background: #0072CE; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Acceder al Curso</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Si tienes dudas, contactanos en <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p>
        </div>
        <div style="background: #001d3d; padding: 15px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegacion Aerea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
        </div>
      </div>
    `,
  });
}

// Notification sent to a STUDENT when staff (admin/instructor) writes them
export async function sendStaffMessageToStudent(
  studentEmail: string,
  studentName: string,
  staffName: string,
  courseName: string,
  messagePreview: string,
  registrationId: string,
) {
  const portalUrl = `${SITE_URL}/tpems/curso/${registrationId}?tab=messages`;
  const cleanPreview = messagePreview.length > 400 ? messagePreview.substring(0, 400) + "..." : messagePreview;

  return transporter.sendMail({
    from: `"ENAE - Escuela de Navegación Aérea" <${FROM}>`,
    to: studentEmail,
    subject: `Nuevo mensaje de ENAE - ${courseName}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003366; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Tienes un nuevo mensaje</h1>
          <p style="color: #93C5FD; margin: 4px 0 0; font-size: 12px;">ENAE TPEMS</p>
        </div>
        <div style="padding: 25px; background: #f9fafb;">
          <p style="font-size: 15px; color: #111827;">Hola <strong>${studentName || "alumno"}</strong>,</p>
          <p style="color: #374151;">
            Has recibido un nuevo mensaje de <strong>${staffName}</strong> en el curso
            <strong>${courseName}</strong>.
          </p>

          <div style="background: white; padding: 18px 20px; border-left: 4px solid #0072CE; border-radius: 4px; margin: 18px 0; color: #1f2937;">
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.5;">${cleanPreview.replace(/</g, "&lt;")}</p>
          </div>

          <div style="text-align: center; margin: 22px 0;">
            <a href="${portalUrl}" style="display: inline-block; background: #0072CE; color: white; padding: 11px 22px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Responder en el portal
            </a>
          </div>

          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            Ingresa al portal del alumno para ver el mensaje completo y responder.
          </p>
        </div>
        <div style="background: #001d3d; padding: 12px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 11px;">Escuela de Navegación Aérea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
        </div>
      </div>
    `,
  });
}

export async function sendStudentMessageNotification(
  recipientEmail: string,
  recipientName: string,
  studentName: string,
  studentEmail: string,
  courseName: string,
  messagePreview: string,
  registrationId: string,
) {
  const portalUrl = `${SITE_URL}/admin/registros/${registrationId}`;
  const cleanPreview = messagePreview.length > 400 ? messagePreview.substring(0, 400) + "..." : messagePreview;

  return transporter.sendMail({
    from: `"ENAE - Escuela de Navegación Aérea" <${FROM}>`,
    to: recipientEmail,
    replyTo: studentEmail,
    subject: `Nuevo mensaje de ${studentName} - ${courseName}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003366; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Nuevo Mensaje del Alumno</h1>
          <p style="color: #93C5FD; margin: 4px 0 0; font-size: 12px;">ENAE LMS</p>
        </div>
        <div style="padding: 25px; background: #f9fafb;">
          <p style="font-size: 15px; color: #111827;">Hola <strong>${recipientName}</strong>,</p>
          <p style="color: #374151;">
            <strong>${studentName}</strong> (<a href="mailto:${studentEmail}">${studentEmail}</a>)
            te envió un mensaje en el curso <strong>${courseName}</strong>.
          </p>

          <div style="background: white; padding: 18px 20px; border-left: 4px solid #0072CE; border-radius: 4px; margin: 18px 0; color: #1f2937;">
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.5;">${cleanPreview.replace(/</g, "&lt;")}</p>
          </div>

          <div style="text-align: center; margin: 22px 0;">
            <a href="${portalUrl}" style="display: inline-block; background: #0072CE; color: white; padding: 11px 22px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Responder al alumno
            </a>
          </div>

          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            Puedes responder directamente a este correo; llegará al alumno. O haz clic en el botón para gestionar desde el panel.
          </p>
        </div>
        <div style="background: #001d3d; padding: 12px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 11px;">Escuela de Navegación Aérea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
        </div>
      </div>
    `,
  });
}

export async function sendDgacCertificate(
  studentName: string,
  studentEmail: string,
  courseName: string,
  pdfBuffer: Buffer,
  fileName: string,
) {
  return transporter.sendMail({
    from: `"ENAE - Escuela de Navegación Aérea" <${FROM}>`,
    to: studentEmail,
    subject: `Certificado DGAC - ${courseName}`,
    attachments: [{ filename: fileName, content: pdfBuffer, contentType: "application/pdf" }],
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #001d3d; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Certificado DGAC</h1>
          <p style="color: #93C5FD; margin: 6px 0 0; font-size: 12px;">Escuela de Navegación Aérea SpA</p>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #111827;">Estimado(a) <strong>${studentName}</strong>,</p>
          <p style="color: #374151; line-height: 1.6;">
            Adjunto encontrarás tu <strong>Certificado DGAC</strong> del curso <strong>${courseName}</strong>.
            Este documento acredita que has cursado y aprobado el programa conforme a la normativa aeronáutica DAN 151,
            y puedes presentarlo ante la <strong>Dirección General de Aeronáutica Civil (DGAC)</strong> para la gestión
            de tu Credencial de Operador de Aeronaves Pilotadas a Distancia (RPA).
          </p>
          <p style="color: #374151; line-height: 1.6;">
            Guarda este certificado en un lugar seguro. Si necesitas una copia adicional o tienes dudas, escríbenos a
            <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a>.
          </p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 30px;">
            ¡Felicitaciones y buenos vuelos!
          </p>
        </div>
        <div style="background: #001d3d; padding: 15px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegación Aérea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
        </div>
      </div>
    `,
  });
}

export async function sendGradeNotificationToStudent(
  studentName: string,
  studentEmail: string,
  courseName: string,
  gradeItemName: string,
  score: number,
) {
  const scoreColor = score >= 80 ? "#16a34a" : "#dc2626";
  const statusLabel = score >= 80 ? "APROBADO" : "REPROBADO";

  return transporter.sendMail({
    from: `"ENAE - Escuela de Navegación Aérea" <${FROM}>`,
    to: studentEmail,
    subject: `Nueva calificación registrada: ${gradeItemName}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003366; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Nueva Calificación Registrada</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #111827;">Hola <strong>${studentName}</strong>,</p>
          <p style="color: #374151;">Tu instructor ha registrado una nueva calificación en tu curso.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Curso</p>
            <p style="margin: 0 0 15px 0; font-weight: 600; color: #111827;">${courseName}</p>

            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Evaluación</p>
            <p style="margin: 0 0 15px 0; font-weight: 600; color: #111827;">${gradeItemName}</p>

            <div style="padding-top: 15px; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px;">Calificación</p>
              <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${scoreColor};">${score}%</p>
              <span style="display: inline-block; background: ${scoreColor}; color: white; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px; margin-top: 8px;">${statusLabel}</span>
            </div>
          </div>

          <p style="color: #374151; font-size: 14px;">
            Puedes ver todas tus calificaciones ingresando a tu portal de alumno.
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${SITE_URL}/tpems" style="display: inline-block; background: #0072CE; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Ir a mi portal
            </a>
          </div>

          <p style="color: #6b7280; font-size: 13px; margin-top: 30px;">
            Si tienes dudas sobre esta calificación, contacta a tu instructor o escríbenos a <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a>.
          </p>
        </div>
        <div style="background: #001d3d; padding: 15px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegación Aérea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
        </div>
      </div>
    `,
  });
}

// =============================================================================
// Notificaciones del Portal del Instructor
// =============================================================================

export async function sendAdminInstructorGradeNotification(args: {
  instructorEmail: string;
  studentName: string;
  courseTitle: string;
  gradeTheoretical: number | null;
  gradePractical: number | null;
  markCompleted: boolean;
}) {
  const { instructorEmail, studentName, courseTitle, gradeTheoretical, gradePractical, markCompleted } = args;
  await transporter.sendMail({
    from: `"ENAE Sistema" <${FROM}>`,
    to: ADMIN_EMAIL,
    subject: `Instructor ingresó calificación · ${studentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color:#003366;">Nueva calificación ingresada por instructor</h2>
        <p><strong>Instructor:</strong> ${instructorEmail}</p>
        <p><strong>Alumno:</strong> ${studentName}</p>
        <p><strong>Curso:</strong> ${courseTitle}</p>
        <ul>
          ${gradeTheoretical != null ? `<li>Nota teórica: <strong>${gradeTheoretical}%</strong></li>` : ""}
          ${gradePractical != null ? `<li>Nota práctica: <strong>${gradePractical}%</strong></li>` : ""}
          ${markCompleted ? `<li><strong>Marcado como completado</strong></li>` : ""}
        </ul>
        <p><a href="${SITE_URL}/admin/registros" style="display:inline-block;background:#0072CE;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Ver en el panel</a></p>
      </div>
    `,
  });
}

export async function sendInstructorFeeProposedNotification(args: {
  instructorEmail: string;
  amount: number;
  students?: { name: string; email: string | null; phone: string | null; course?: string | null; date?: string | null }[];
  notes?: string | null;
}) {
  const students = args.students || [];
  const studentRows = students.map((s) => `
    <tr>
      <td style="border:1px solid #d1d5db;padding:7px 10px;">${s.name}</td>
      <td style="border:1px solid #d1d5db;padding:7px 10px;">${s.email || "—"}</td>
      <td style="border:1px solid #d1d5db;padding:7px 10px;">${s.phone || "—"}</td>
      <td style="border:1px solid #d1d5db;padding:7px 10px;">${[s.course, s.date].filter(Boolean).join(" · ") || "—"}</td>
    </tr>`).join("");

  await transporter.sendMail({
    from: `"ENAE Sistema" <${FROM}>`,
    to: args.instructorEmail,
    subject: `ENAE: Honorario propuesto $${args.amount.toLocaleString("es-CL")} CLP${students.length > 0 ? ` · ${students.length} alumno${students.length > 1 ? "s" : ""}` : ""}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px;">
        <h2 style="color:#003366;">Honorario propuesto</h2>
        <p>El admin de ENAE ha propuesto un honorario de <strong>$${args.amount.toLocaleString("es-CL")} CLP</strong>${students.length > 0 ? ` por la instrucción de ${students.length} alumno${students.length > 1 ? "s" : ""}` : " para una de tus clases"}.</p>
        ${students.length > 0 ? `
        <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:13px;color:#111827;">
          <thead>
            <tr style="background:#003366;color:white;">
              <th style="border:1px solid #d1d5db;padding:7px 10px;text-align:left;">Alumno</th>
              <th style="border:1px solid #d1d5db;padding:7px 10px;text-align:left;">Email</th>
              <th style="border:1px solid #d1d5db;padding:7px 10px;text-align:left;">Teléfono</th>
              <th style="border:1px solid #d1d5db;padding:7px 10px;text-align:left;">Curso · Fecha</th>
            </tr>
          </thead>
          <tbody>${studentRows}</tbody>
        </table>` : ""}
        ${args.notes ? `<p style="color:#4b5563;font-size:13px;background:#f3f4f6;border-radius:4px;padding:10px;">${args.notes}</p>` : ""}
        <p>Ingresa al portal para revisarlo y aprobarlo o rechazarlo.</p>
        <p><a href="${SITE_URL}/instructor/honorarios" style="display:inline-block;background:#0072CE;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Ir a Honorarios</a></p>
        <p style="color:#9ca3af;font-size:11px;margin-top:20px;">Escuela de Navegación Aérea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
      </div>
    `,
  });
}

export async function sendAdminFeeStatusNotification(args: {
  instructorEmail: string;
  amount: number;
  action: "approve" | "reject";
}) {
  const accion = args.action === "approve" ? "aprobó" : "rechazó";
  await transporter.sendMail({
    from: `"ENAE Sistema" <${FROM}>`,
    to: ADMIN_EMAIL,
    subject: `Instructor ${accion} honorario · ${args.instructorEmail}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color:#003366;">Instructor ${accion} su honorario</h2>
        <p><strong>Instructor:</strong> ${args.instructorEmail}</p>
        <p><strong>Monto:</strong> $${args.amount.toLocaleString("es-CL")} CLP</p>
        <p><a href="${SITE_URL}/admin/honorarios" style="display:inline-block;background:#0072CE;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Ir a Honorarios</a></p>
      </div>
    `,
  });
}

// =============================================================================
// Invitación a clase sincrónica / examen / tarea
// =============================================================================

export async function sendSynchronousClassInvitation(args: {
  to: string;
  studentName: string;
  courseTitle: string;
  classTitle: string;
  kind: string;
  scheduledAt: string;
  durationMin: number;
  linkUrl: string | null;
  description: string | null;
}) {
  const { to, studentName, courseTitle, classTitle, kind, scheduledAt, durationMin, linkUrl, description } = args;
  const when = new Date(scheduledAt).toLocaleString("es-CL", { dateStyle: "full", timeStyle: "short" });
  const kindLabel: Record<string, string> = {
    class: "Clase sincrónica",
    exam: "Examen en línea",
    assignment: "Tarea",
    workshop: "Taller",
    meeting: "Reunión",
  };
  await transporter.sendMail({
    from: `"ENAE Training" <${FROM}>`,
    to,
    subject: `${kindLabel[kind] || "Clase"}: ${classTitle} · ${when}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003366; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">${kindLabel[kind] || "Clase"}</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #111827;">Hola <strong>${studentName}</strong>,</p>
          <p style="color: #374151;">Te invitamos a la siguiente actividad de tu curso <strong>${courseTitle}</strong>:</p>

          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 18px; font-weight: 600; color: #003366; margin: 0 0 12px 0;">${classTitle}</p>
            <p style="margin: 6px 0; color: #374151;"><strong>Fecha:</strong> ${when}</p>
            <p style="margin: 6px 0; color: #374151;"><strong>Duración:</strong> ${durationMin} minutos</p>
            ${description ? `<p style="margin: 12px 0; color: #4b5563; font-size: 14px; padding: 10px; background: #f3f4f6; border-radius: 4px;">${description}</p>` : ""}
          </div>

          ${linkUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${linkUrl}" style="display: inline-block; background: #0072CE; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                ${kind === "exam" ? "Ingresar al examen" : kind === "assignment" ? "Acceder a la tarea" : "Unirse a la clase"}
              </a>
              <p style="font-size: 12px; color: #6b7280; margin-top: 12px;">O copia este link: <a href="${linkUrl}">${linkUrl}</a></p>
            </div>
          ` : ""}

          <p style="color: #6b7280; font-size: 13px; margin-top: 30px;">
            También puedes ver tus clases programadas en el <a href="${SITE_URL}/tpems">Portal de Alumno</a>.
          </p>
        </div>
        <div style="background: #001d3d; padding: 15px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegación Aérea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
        </div>
      </div>
    `,
  });
}

// Mensaje del INSTRUCTOR al administrador (mesa de ayuda)
export async function sendInstructorMessageToAdmin(args: {
  instructorEmail: string;
  instructorName: string;
  subject: string;
  message: string;
}) {
  await transporter.sendMail({
    from: `"ENAE Sistema" <${FROM}>`,
    to: ADMIN_EMAIL,
    replyTo: args.instructorEmail,
    subject: `Instructor · ${args.subject || "Consulta"} — ${args.instructorName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color:#003366;">Mensaje de instructor</h2>
        <p><strong>De:</strong> ${args.instructorName} &lt;${args.instructorEmail}&gt;</p>
        <p><strong>Asunto:</strong> ${args.subject || "Consulta"}</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;color:#111827;">
          ${args.message.replace(/\n/g, "<br/>")}
        </div>
        <p style="font-size:12px;color:#6b7280;">Responde directamente a este correo para contactar al instructor.</p>
      </div>
    `,
  });
}

export type PracticaScheduleInfo = {
  date: string | null;       // YYYY-MM-DD
  time: string | null;       // HH:mm
  city: string | null;
  locationName: string | null;
  locationUrl: string | null;
  course: string | null;
};

function formatPracticaFecha(s: PracticaScheduleInfo): string {
  const fecha = s.date
    ? new Date(s.date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "por confirmar";
  return `${fecha}${s.time ? ` · ${s.time} hrs` : ""}`;
}

function formatPracticaLugar(s: PracticaScheduleInfo): string {
  return [s.locationName, s.city].filter(Boolean).join(", ") || "por confirmar";
}

// Al INSTRUCTOR: datos de los alumnos de su clase práctica
export async function sendPracticaDataToInstructor(args: {
  instructorEmail: string;
  instructorName: string;
  students: { name: string; email: string | null; phone: string | null; rut: string | null; schedule: PracticaScheduleInfo }[];
}) {
  const rows = args.students.map((st) => `
    <tr>
      <td style="border:1px solid #d1d5db;padding:7px 10px;">${st.name}</td>
      <td style="border:1px solid #d1d5db;padding:7px 10px;">${st.rut || "—"}</td>
      <td style="border:1px solid #d1d5db;padding:7px 10px;">${st.email || "—"}</td>
      <td style="border:1px solid #d1d5db;padding:7px 10px;">${st.phone || "—"}</td>
      <td style="border:1px solid #d1d5db;padding:7px 10px;">${formatPracticaFecha(st.schedule)}<br/><span style="color:#6b7280;">${formatPracticaLugar(st.schedule)}</span></td>
    </tr>`).join("");

  await transporter.sendMail({
    from: `"ENAE Sistema" <${FROM}>`,
    to: args.instructorEmail,
    cc: ADMIN_EMAIL,
    subject: `ENAE: Datos de tus alumnos para la clase práctica (${args.students.length})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px;">
        <h2 style="color:#003366;">Clase práctica — datos de tus alumnos</h2>
        <p>Hola <strong>${args.instructorName}</strong>, estos son los datos de contacto de tu${args.students.length > 1 ? "s" : ""} ${args.students.length} alumno${args.students.length > 1 ? "s" : ""} asignado${args.students.length > 1 ? "s" : ""}:</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:13px;color:#111827;">
          <thead>
            <tr style="background:#003366;color:white;">
              <th style="border:1px solid #d1d5db;padding:7px 10px;text-align:left;">Alumno</th>
              <th style="border:1px solid #d1d5db;padding:7px 10px;text-align:left;">RUT</th>
              <th style="border:1px solid #d1d5db;padding:7px 10px;text-align:left;">Email</th>
              <th style="border:1px solid #d1d5db;padding:7px 10px;text-align:left;">Teléfono</th>
              <th style="border:1px solid #d1d5db;padding:7px 10px;text-align:left;">Fecha · Lugar</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="font-size:13px;color:#4b5563;">Recuerda registrar la evaluación práctica (formato ENAE-CHL-N1) en el <a href="${SITE_URL}/instructor">portal de instructor</a> al finalizar cada clase.</p>
        <p style="color:#9ca3af;font-size:11px;margin-top:20px;">Escuela de Navegación Aérea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
      </div>
    `,
  });
}

// Al ALUMNO: datos del instructor y de su clase práctica
export async function sendPracticaDataToStudent(args: {
  studentEmail: string;
  studentName: string;
  instructor: { name: string; email: string; phone: string | null };
  schedule: PracticaScheduleInfo;
}) {
  const s = args.schedule;
  await transporter.sendMail({
    from: `"ENAE Training" <${FROM}>`,
    to: args.studentEmail,
    subject: `ENAE: Tu clase práctica de vuelo — ${s.date ? new Date(s.date + "T12:00:00").toLocaleDateString("es-CL") : "coordinación"}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003366; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🛩️ Tu Clase Práctica de Vuelo</h1>
          ${s.course ? `<p style="color:#93C5FD;margin:5px 0 0;font-size:13px;">${s.course}</p>` : ""}
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="color:#111827;">Hola <strong>${args.studentName}</strong>,</p>
          <p style="color:#374151;">Tu clase práctica quedó coordinada con los siguientes datos:</p>
          <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:16px 0;">
            <p style="margin:6px 0;color:#374151;">📅 <strong>Fecha y hora:</strong> ${formatPracticaFecha(s)}</p>
            <p style="margin:6px 0;color:#374151;">📍 <strong>Lugar:</strong> ${formatPracticaLugar(s)}
              ${s.locationUrl ? ` — <a href="${s.locationUrl}" style="color:#0072CE;">Ver en Google Maps</a>` : ""}</p>
            <p style="margin:14px 0 6px;color:#374151;">🧑‍🏫 <strong>Tu instructor:</strong> ${args.instructor.name}</p>
            ${args.instructor.phone ? `<p style="margin:6px 0;color:#374151;">📞 ${args.instructor.phone}</p>` : ""}
            <p style="margin:6px 0;color:#374151;">✉️ <a href="mailto:${args.instructor.email}" style="color:#0072CE;">${args.instructor.email}</a></p>
          </div>
          <p style="color:#374151;font-size:14px;">Llega con anticipación y coordina cualquier cambio directamente con tu instructor. Después de la clase podrás revisar y firmar tu evaluación práctica en el <a href="${SITE_URL}/tpems" style="color:#0072CE;">Portal de Alumno</a>.</p>
        </div>
        <div style="background: #001d3d; padding: 15px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegación Aérea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
        </div>
      </div>
    `,
  });
}

export const TEORICOS_DGAC_EMAIL = process.env.TEORICOS_DGAC_EMAIL || "teoricosag@dgac.gob.cl";

export type SolicitudExamenStudent = {
  name: string;
  rut: string; // RUT o Pasaporte
  folio: string;
  examDatetime: string; // ISO
  unitCity: string;
  email: string | null;
  supervisorEmail?: string | null;
};

// Construye el correo (asunto, destinatarios, HTML) sin enviarlo — se usa
// también para el borrador que se muestra al admin antes de confirmar.
// esApertura=true → provincia (ya pre-coordinado con la unidad, se pide
// abrir la opción de rendir en el portal SIPA); false → Santiago directo.
export function buildSolicitudExamenEmail(args: {
  students: SolicitudExamenStudent[];
  ccAlumnos: boolean;
  ccSupervisores?: boolean;
  esApertura: boolean;
  mensajeExtra?: string;
}): { subject: string; html: string; to: string; cc: string[] } {
  const { students, ccAlumnos, ccSupervisores, esApertura, mensajeExtra } = args;

  const rows = students.map((s) => `
    <tr>
      <td style="border: 1px solid #d1d5db; padding: 8px 10px;">${s.name}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px 10px;">${s.rut}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px 10px; text-align: center;">${s.folio}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px 10px;">${new Date(s.examDatetime).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santiago" })}</td>
      <td style="border: 1px solid #d1d5db; padding: 8px 10px;">${s.unitCity}</td>
    </tr>`).join("");

  const intro = esApertura
    ? "Junto con saludar, y habiendo realizado la pre-coordinación con la unidad correspondiente, solicitamos la apertura de la opción de rendir el examen teórico de Operador RPAS en el portal SIPA para el/los siguiente(s) alumno(s) de nuestra escuela:"
    : "Junto con saludar, solicitamos agendar hora para rendir el examen teórico de Operador RPAS para el/los siguiente(s) alumno(s) de nuestra escuela:";

  const subject = esApertura
    ? `ENAE - Solicitud apertura examen Operador RPAS en SIPA (${students.length} alumno${students.length > 1 ? "s" : ""})`
    : `ENAE - Solicitud agendamiento examen Operador RPAS (${students.length} alumno${students.length > 1 ? "s" : ""})`;

  const cc = [ADMIN_EMAIL];
  if (ccAlumnos) {
    for (const s of students) if (s.email) cc.push(s.email);
  }
  if (ccSupervisores) {
    for (const s of students) if (s.supervisorEmail) cc.push(s.supervisorEmail);
  }

  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: #003366; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Escuela de Navegación Aérea - ENAE</h1>
          <p style="color: #93C5FD; margin: 5px 0 0; font-size: 12px;">www.enae.cl · Certificada ISO 9001:2015</p>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="color: #111827;">Estimados Teóricos Licencias, DGAC:</p>
          <p style="color: #374151;">${intro}</p>
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 14px; color: #111827;">
            <thead>
              <tr style="background: #003366; color: white;">
                <th style="border: 1px solid #d1d5db; padding: 8px 10px; text-align: left;">Nombre</th>
                <th style="border: 1px solid #d1d5db; padding: 8px 10px; text-align: left;">RUT / Pasaporte</th>
                <th style="border: 1px solid #d1d5db; padding: 8px 10px;">N° Folio</th>
                <th style="border: 1px solid #d1d5db; padding: 8px 10px; text-align: left;">Fecha y hora solicitada</th>
                <th style="border: 1px solid #d1d5db; padding: 8px 10px; text-align: left;">Unidad / Ciudad</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${mensajeExtra ? `<p style="color: #4b5563; font-size: 14px; padding: 10px; background: #f3f4f6; border-radius: 4px;">${mensajeExtra}</p>` : ""}
          <p style="color: #374151;">Quedamos atentos a su confirmación.</p>
          <p style="color: #374151;">Atentamente,<br/><strong>Escuela de Navegación Aérea - ENAE</strong><br/>${ADMIN_EMAIL}<br/><span style="font-size: 12px; color: #6b7280;">Certificada ISO 9001:2015 — Cert. N° ESC/QMS/G26/5904 (SAARA · UAF/IAF)</span></p>
        </div>
        <div style="background: #001d3d; padding: 15px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegación Aérea | AOC 1521 DGAC | Certificada ISO 9001:2015</p>
        </div>
      </div>
    `;

  return {
    subject,
    html,
    to: TEORICOS_DGAC_EMAIL,
    cc: Array.from(new Set(cc.map((e) => e.toLowerCase()))),
  };
}

// Envía la solicitud construida por buildSolicitudExamenEmail.
export async function sendSolicitudExamenTeoricos(args: {
  students: SolicitudExamenStudent[];
  ccAlumnos: boolean;
  ccSupervisores?: boolean;
  esApertura: boolean;
  mensajeExtra?: string;
}) {
  const { subject, html, to, cc } = buildSolicitudExamenEmail(args);
  await transporter.sendMail({
    from: `"Escuela de Navegación Aérea - ENAE" <${FROM}>`,
    to,
    cc,
    replyTo: ADMIN_EMAIL,
    subject,
    html,
  });
}
