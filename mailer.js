/**
 * mailer.js
 * ----------------------------------------------------------------
 * Sends the password-reset OTP email using Gmail via nodemailer.
 * Uses EMAIL_USER / EMAIL_APP_PASSWORD from .env (a Gmail "App
 * Password", not your real Gmail password).
 * ----------------------------------------------------------------
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: `"Kam App" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Kam password reset code',
    text: `Your one-time password reset code is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <p>Your one-time password reset code is:</p>
        <h2 style="letter-spacing: 6px;">${otp}</h2>
        <p style="color:#666; font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

async function sendPaymentDueEmail(toEmail, hirerName, jobTitle, bookingId) {
  if (!toEmail) return; // some OAuth users may have no email on file
  await transporter.sendMail({
    from: `"Kam App" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Payment due — "${jobTitle}" is complete`,
    text: `Hi ${hirerName},\n\nYour worker has marked "${jobTitle}" as completed. Please open the Kam app and pay for this booking (#${bookingId}) via eSewa or Khalti.\n\nThanks,\nKam`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <p>Hi ${hirerName},</p>
        <p>Your worker has marked <strong>"${jobTitle}"</strong> as completed.</p>
        <p>Please open the Kam app and pay for this booking via eSewa or Khalti.</p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail, sendPaymentDueEmail };