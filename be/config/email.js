const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

async function sendEmail(to, subject, text) {
    try {
        const info = await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: to,
            subject: subject,
            text: text
        });
        console.log('Email sent: ' + info.messageId);
        return { success: true, messageId: info.messageId };
    }
    catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error };
    }
}

module.exports = {
    sendEmail
};
