const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT || 465),
    secure: String(process.env.EMAIL_SECURE || "true") === "true",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        // Ignore l'erreur de certificat auto-signe (a utiliser uniquement en developpement)
        rejectUnauthorized: false,
    }
});

/**
 * Envoie un email avec possibilité de choisir l'expéditeur
 * @param {string} to - L'adresse email du destinataire
 * @param {string} subject - Objet de l'email
 * @param {string} content - Contenu du mail
 * @param {boolean} isHtml - Indique si le contenu est en HTML
 * @param {string} from - L'adresse email de l'expéditeur (par défaut l'admin)
 */
const sendMail = (
    to,
    subject,
    content,
    isHtml = false,
    from = process.env.EMAIL_FROM || process.env.EMAIL_USER,
    attachments = []
) => {
    return new Promise((resolve, reject) => {
        if (!to) {
            console.error('Aucun destinataire specifie.');
            return resolve(false);
        }

        const mailOptions = {
            from: from,
            to: to,
            subject: subject,
            [isHtml ? 'html' : 'text']: content,
            attachments: Array.isArray(attachments) ? attachments : []
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("Erreur lors de l'envoi de l'e-mail :", err);
                return reject(err);
            }
            console.log('E-mail envoye : ' + info.response);
            return resolve(info);
        });
    });
};

module.exports = { sendMail };
