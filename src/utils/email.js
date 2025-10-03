const nodemailer = require('nodemailer');

const createTransporter = async () => {
    if (process.env.NODE_ENV === 'development') {
        const testAccount = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false, 
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }

    
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true', 
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

const sendEmail = async ({ from, to, subject, text, html }) => {
    const transporter = await createTransporter();

    const mailOptions = {
        from: from || '"My App" <no-reply@myapp.com>', 
        to,
        subject,
        text,
        html,
    };

    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV === 'development') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
};




const sendPasswordResetEmail= async (email,resetURL,userName) => {
    return await sendEmail({
        to: email,
        subject: 'Password Reset',
        html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>Hi ${userName},</p>
                <p>Click the link below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetURL}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                        Reset Password
                    </a>
                </div>
                <p><strong>This link expires in 15 minutes.</strong></p>
            </div>
        `
    })

}





module.exports= {sendEmail,sendPasswordResetEmail}