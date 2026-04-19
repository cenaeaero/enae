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
          <a href="${SITE_URL}/tpems/login" style="display: inline-block; background: #0072CE; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Acceder al Portal</a>
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Si tienes dudas, contactanos en <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p>
        </div>
        <div style="background: #001d3d; padding: 15px; text-align: center;">
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegacion Aerea | AOC 1521 DGAC</p>
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
<p style="margin:0 0 5px;">Escuela de Navegacion Aerea SpA | AOC 1521 DGAC</p>
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
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegacion Aerea | AOC 1521 DGAC</p>
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
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegacion Aerea | AOC 1521 DGAC</p>
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
          <p style="color: #93C5FD; margin: 0; font-size: 11px;">Escuela de Navegación Aérea | AOC 1521 DGAC</p>
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
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegación Aérea | AOC 1521 DGAC</p>
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
          <p style="color: #93C5FD; margin: 0; font-size: 12px;">Escuela de Navegación Aérea | AOC 1521 DGAC</p>
        </div>
      </div>
    `,
  });
}
