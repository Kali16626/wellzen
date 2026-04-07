import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    const emailUser = process.env.EMAIL_USER || 'admin.wellzen@gmail.com';
    const emailPass = process.env.EMAIL_PASS || 'trzx zlij skzw jxnk';

    if (!emailUser || !emailPass) {
      return null;
    }
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass.replace(/\s/g, ''), // Ensure no spaces
      },
    });
  }
  return transporter;
};

export const sendRealEmail = async (to: string, subject: string, text: string, html?: string): Promise<boolean> => {
  try {
    const activeTransporter = getTransporter();
    
    if (!activeTransporter) {
      console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set in backend/.env. Email not sent.');
      return false;
    }

    const emailUser = process.env.EMAIL_USER || 'admin.wellzen@gmail.com';
    const info = await activeTransporter.sendMail({
      from: `"WellZen System" <${emailUser}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`✅ Real Email sent successfully! Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send real email. Check your EMAIL_USER and EMAIL_PASS App Password in .env:', error);
    return false;
  }
};
