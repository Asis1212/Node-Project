const nodemailer = require("nodemailer");

const sendEmail = async options => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USERNAME,
            pass: process.env.GMAIL_PASSWORD
        }
    });

    let mailOptions = {
        from: "ADMIN <admin@admin.io>",
        to: options.email,
        subject: options.subject,
        html: `<h1>Click on the link to reset your password</h1> <br>
        <a href='http://127.0.0.1:3000/Reset-Password/${options.token}'>Reset-Password</a>`
    }

    await transporter.sendMail(mailOptions);
}

module.exports = sendEmail;