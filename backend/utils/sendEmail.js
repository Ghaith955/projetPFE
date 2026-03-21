const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true pour port 465, false pour 587
    auth: {
        user: process.env.EMAIL_USER, // Email administrateur (ex : admin@gmail.com)
        pass: process.env.EMAIL_PASS, // Mot de passe ou mot de passe d'application si 2FA activé
    },
    tls: {
        // Ignore l'erreur de certificat auto-signé (à utiliser uniquement en développement)
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
const sendMail = (to, subject, content, isHtml = false, from = process.env.EMAIL_USER) => {
    if (!to) {
        console.error("Aucun destinataire spécifié.");
        return;
    }

    const mailOptions = {
        from: from,
        to: to,
        subject: subject,
        [isHtml ? "html" : "text"]: content
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error("Erreur lors de l'envoi de l'e-mail :", err);
        } else {
            console.log('E-mail envoyé : ' + info.response);
        }
    });
};

module.exports = { sendMail };
