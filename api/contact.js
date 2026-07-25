const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_TO,
  EMAIL_FROM,
} = process.env;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : undefined,
  secure: SMTP_PORT && parseInt(SMTP_PORT, 10) === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_TO) {
    res.status(500).json({ error: 'Email service is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_TO.' });
    return;
  }

  const { name, email, message } = req.body || {};

  if (!name || !email || !message || !validateEmail(email)) {
    res.status(400).json({ error: 'Please provide a valid name, email, and message.' });
    return;
  }

  try {
    await transporter.verify();
  } catch (verifyError) {
    console.error('SMTP verification failed:', verifyError);
    res.status(500).json({ error: 'Unable to connect to the email service. Please check the SMTP settings.' });
    return;
  }

  const mailOptions = {
    from: `"Angel Bargola Portfolio" <${EMAIL_FROM}>`,
    to: EMAIL_TO,
    subject: `New contact message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
    replyTo: email,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true });
  } catch (sendError) {
    console.error('Email send failed:', sendError);
    res.status(500).json({ error: 'Failed to send your message. Please try again later.' });
  }
};
