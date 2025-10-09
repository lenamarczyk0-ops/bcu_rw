const express = require('express');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const router = express.Router();

// Email configuration - using environment variables
const createTransporter = () => {
  // For Railway deployment, use SMTP service
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // Fallback to Gmail for development (requires app password)
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS, // App password, not regular password
      },
    });
  }
  
  // For development - use Ethereal (test email service)
  return null; // Will be handled in the route
};

// Contact form submission
router.post('/', [
  // Validation middleware
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Imię i nazwisko musi mieć od 2 do 100 znaków')
    .escape(),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Podaj prawidłowy adres email'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Numer telefonu może mieć maksymalnie 20 znaków')
    .escape(),
  body('subject')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Temat musi mieć od 3 do 200 znaków')
    .escape(),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Wiadomość musi mieć od 10 do 2000 znaków')
    .escape(),
  body('privacy')
    .equals('on')
    .withMessage('Musisz wyrazić zgodę na przetwarzanie danych osobowych')
], async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Błędne dane formularza',
        errors: errors.array()
      });
    }

    const { name, email, phone, subject, message } = req.body;

    // Create transporter
    let transporter = createTransporter();
    
    // If no transporter configured, create test account
    if (!transporter) {
      console.log('No email configuration found, creating test account...');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    // Email content
    const emailSubject = `[BCU SPEDYCJA] ${subject}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1f2937; color: white; padding: 20px; text-align: center;">
          <h2>Nowa wiadomość z formularza kontaktowego</h2>
          <p>BCU SPEDYCJA - Branżowe Centrum Umiejętności</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h3 style="color: #1f2937; margin-top: 0;">Szczegóły wiadomości</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 120px;">Imię i nazwisko:</td>
                <td style="padding: 8px 0; color: #6b7280;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td>
                <td style="padding: 8px 0; color: #6b7280;">${email}</td>
              </tr>
              ${phone ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Telefon:</td>
                <td style="padding: 8px 0; color: #6b7280;">${phone}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Temat:</td>
                <td style="padding: 8px 0; color: #6b7280;">${subject}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Data:</td>
                <td style="padding: 8px 0; color: #6b7280;">${new Date().toLocaleString('pl-PL')}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h4 style="color: #1f2937; margin-top: 0;">Treść wiadomości:</h4>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; color: #374151; line-height: 1.6;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>Instrukcja:</strong> Aby odpowiedzieć na tę wiadomość, wyślij email bezpośrednio na adres: <strong>${email}</strong>
            </p>
          </div>
        </div>
        
        <div style="background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">Ta wiadomość została wysłana z formularza kontaktowego na stronie bcu-spedycja.pl</p>
          <p style="margin: 5px 0 0 0;">© 2025 BCU SPEDYCJA - Branżowe Centrum Umiejętności</p>
        </div>
      </div>
    `;

    const emailText = `
Nowa wiadomość z formularza kontaktowego BCU SPEDYCJA

Imię i nazwisko: ${name}
Email: ${email}
${phone ? `Telefon: ${phone}` : ''}
Temat: ${subject}
Data: ${new Date().toLocaleString('pl-PL')}

Treść wiadomości:
${message}

---
Aby odpowiedzieć, wyślij email na: ${email}
Ta wiadomość została wysłana z formularza na bcu-spedycja.pl
    `;

    // Send email
    const mailOptions = {
      from: {
        name: 'BCU SPEDYCJA - Formularz kontaktowy',
        address: process.env.SMTP_USER || 'noreply@bcu-spedycja.pl'
      },
      to: 'sekretariat@bcu-spedycja.pl',
      replyTo: email, // Allow direct replies to sender
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      headers: {
        'X-Contact-Form': 'BCU-SPEDYCJA',
        'X-Sender-IP': req.ip,
        'X-User-Agent': req.get('User-Agent') || 'Unknown'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Contact email sent successfully:', {
      messageId: info.messageId,
      from: email,
      subject: subject,
      timestamp: new Date().toISOString()
    });

    // If using test account, log preview URL
    if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST && !process.env.GMAIL_USER) {
      console.log('Preview email: ' + nodemailer.getTestMessageUrl(info));
    }

    res.json({
      success: true,
      message: 'Wiadomość została wysłana pomyślnie. Odpowiemy tak szybko, jak to możliwe.',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Contact form error:', error);
    
    // Don't expose internal errors to client
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas wysyłania wiadomości. Spróbuj ponownie lub skontaktuj się bezpośrednio: sekretariat@bcu-spedycja.pl'
    });
  }
});

module.exports = router;
