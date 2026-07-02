import nodemailer from 'nodemailer';

const createTransporter = () => nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendOTPEmail = async (email, otp) => {
    console.log('OTP:', otp); // temporary - remove after testing
  const transporter = createTransporter();
  
  console.log('Sending to:', email);
  console.log('From:', process.env.EMAIL_USER);

  await transporter.sendMail({
    from: `"Presense" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Presense Verification Code',
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h1 style="font-size: 24px; letter-spacing: 4px; text-transform: uppercase; color: #1A1A1A;">Presense</h1>
        <p style="color: #6b7280; font-size: 14px;">Your verification code is:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #D4AF37; margin: 24px 0;">${otp}</div>
        <p style="color: #6b7280; font-size: 12px;">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `
  });
};