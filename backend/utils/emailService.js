// backend/utils/emailService.js
/**
 * Nodemailer email service.
 * Configure SMTP credentials in backend/.env:
 *   EMAIL_HOST=smtp.gmail.com
 *   EMAIL_PORT=587
 *   EMAIL_USER=your@gmail.com
 *   EMAIL_PASS=your_app_password
 *   EMAIL_FROM="PlaceCloud <no-reply@placecloud.app>"
 */
const nodemailer = require('nodemailer');

const createTransporter = () => {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 587,
    secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
};

let transporter = null;
const getTransporter = () => {
  if (!transporter) transporter = createTransporter();
  return transporter;
};

/**
 * Send a single email. Returns true on success, false if SMTP is not configured.
 */
const sendMail = async ({ to, subject, html, text }) => {
  const t = getTransporter();
  if (!t) {
    console.warn('[emailService] SMTP not configured — skipping email to', to);
    return false;
  }
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || `"PlaceCloud" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (err) {
    console.error('[emailService] Failed to send email:', err.message);
    return false;
  }
};

/** Interview reminder email body */
const buildInterviewReminderHtml = (data) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0D1425;color:#E8EDF5;padding:32px;border-radius:12px">
  <h2 style="color:#00A3FF;margin-top:0">📅 Interview Reminder</h2>
  <p>Hi <strong>${data.studentName || 'Student'}</strong>,</p>
  <p>This is a reminder that you have an upcoming interview:</p>
  <div style="background:#1A2540;border-radius:8px;padding:16px;margin:16px 0">
    <p style="margin:4px 0"><strong>Company:</strong> ${data.company}</p>
    <p style="margin:4px 0"><strong>Role:</strong> ${data.role}</p>
    <p style="margin:4px 0"><strong>Round:</strong> ${data.round || 'Interview'}</p>
    <p style="margin:4px 0"><strong>Date:</strong> ${data.date}</p>
    <p style="margin:4px 0"><strong>Time:</strong> ${data.time || 'TBD'}</p>
    <p style="margin:4px 0"><strong>Mode:</strong> ${data.mode || 'Online'}</p>
    ${data.link ? `<p style="margin:4px 0"><strong>Link:</strong> <a href="${data.link}" style="color:#00A3FF">${data.link}</a></p>` : ''}
  </div>
  <p style="color:#8899AA;font-size:12px">Best of luck! — PlaceCloud Team</p>
</div>`;

/** Application status change email */
const buildStatusUpdateHtml = (data) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0D1425;color:#E8EDF5;padding:32px;border-radius:12px">
  <h2 style="color:#00A3FF;margin-top:0">📬 Application Status Update</h2>
  <p>Hi <strong>${data.studentName || 'Student'}</strong>,</p>
  <p>Your application status has been updated:</p>
  <div style="background:#1A2540;border-radius:8px;padding:16px;margin:16px 0">
    <p style="margin:4px 0"><strong>Company:</strong> ${data.company}</p>
    <p style="margin:4px 0"><strong>Role:</strong> ${data.role}</p>
    <p style="margin:4px 0"><strong>New Status:</strong> <span style="color:#00A3FF">${data.status}</span></p>
  </div>
  <p style="color:#8899AA;font-size:12px">Log in to PlaceCloud to view full details.</p>
</div>`;

module.exports = { sendMail, buildInterviewReminderHtml, buildStatusUpdateHtml };
