// This service handles the actual delivery of notifications across different channels
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const sendSMS = async (phoneNumber, message) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!sid || !token || !from) return false;
    const client = twilio(sid, token);
    await client.messages.create({ body: message, from, to: phoneNumber });
    return true;
};

const sendEmail = async (to, subject, text, html) => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return false;
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
        from: process.env.SMTP_FROM || `"School Registry" <${process.env.SMTP_USER}>`,
        to, subject, text, html
    });
    return true;
};

module.exports = { sendSMS, sendEmail };
