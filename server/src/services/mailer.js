const nodemailer = require('nodemailer');
const { logger } = require('./logger');

let transporter;

function getTransport() {
  if (transporter) return transporter;
  if (process.env.SMTP_URL) {
    transporter = nodemailer.createTransport(process.env.SMTP_URL);
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM || 'FreelanceHub <noreply@freelancehub.dev>';
  const info = await getTransport().sendMail({ from, to, subject, text, html: html || text });
  logger.info({ to, subject, messageId: info.messageId }, 'mail sent');
  if (info.message) logger.info({ preview: String(info.message).slice(0, 400) }, 'mail body');
  return info;
}

module.exports = { sendMail };
