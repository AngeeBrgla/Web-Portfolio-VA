const nodemailer = require('nodemailer');

const requiredEnv = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_TO',
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
};

const transporter = nodemailer.createTransport(smtpConfig);

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeString(value) {
  return String(value || '').replace(/[\r\n<>]/g, ' ').trim();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (missingEnv.length > 0) {
    return res.status(500).json({
      error: 'Missing SMTP configuration. Please set the required environment variables.',
      missing: missingEnv,
    });
  }

  const rawBody = req.body || {};
  const name = sanitizeString(rawBody.name);
  const email = sanitizeString(rawBody.email);
  const message = sanitizeString(rawBody.message);

  if (!name || !email || !message || !validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid contact data. Please provide a valid name, email, and message.' });
  }

  try {
    await transporter.verify();
  } catch (verifyError) {
    console.error('SMTP verification failed:', { code: verifyError.code, message: verifyError.message });

    if (verifyError.code === 'EAUTH') {
      return res.status(500).json({ error: 'SMTP authentication failed. Please verify your SMTP username and password.' });
    }

    if (verifyError.code === 'ETIMEDOUT' || verifyError.code === 'ESOCKET') {
      return res.status(500).json({ error: 'SMTP connection timed out. Please check your SMTP host, port, and network connectivity.' });
    }

    return res.status(500).json({ error: 'Unable to connect to the email service. Please verify your SMTP settings.' });
  }

  const EMAIL_TO = process.env.EMAIL_TO;
  const EMAIL_FROM = process.env.EMAIL_FROM;
  const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Angel Bargola Web Profile';

  const fromAddress = EMAIL_FROM && EMAIL_FROM.includes('@')
    ? EMAIL_FROM
    : process.env.SMTP_USER;

  const mailOptions = {
    from: `"${sanitizeString(EMAIL_FROM_NAME)}" <${fromAddress}>`,
    to: EMAIL_TO,
    subject: `New contact message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
    replyTo: email,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: 'Your message has been sent successfully.' });
  } catch (sendError) {
    console.error('Email send failed:', {
      code: sendError.code,
      response: sendError.response && sendError.response.toString ? sendError.response.toString() : undefined,
      message: sendError.message,
    });

    if (sendError.code === 'EAUTH') {
      return res.status(500).json({ error: 'SMTP authentication failed while sending email.' });
    }

    if (sendError.code === 'ETIMEDOUT' || sendError.code === 'ESOCKET') {
      return res.status(500).json({ error: 'SMTP connection timed out while sending email.' });
    }

    return res.status(500).json({ error: 'Unable to send email. Please try again later.' });
  }
};
