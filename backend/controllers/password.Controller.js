const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { sendMail } = require("../utils/sendEmail");
const { buildPasswordResetEmail, getLogoAttachment } = require("../utils/emailTemplates");

const passwordController = {};

passwordController.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(" Demande de réinitialisation pour :", email);

    const user = await User.findOne({ email }).exec();
    if (!user) {
      console.log(" Utilisateur non trouvé !");
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expirationTime = new Date(Date.now() + 3600000); // Stocke bien une date

    // Mise à jour de l'utilisateur
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { resetPasswordToken: token, resetPasswordExpires: expirationTime },
      { new: true, runValidators: true }
    );

    console.log(" Token enregistré en base :", updatedUser.resetPasswordToken);
    console.log(" Expiration en base :", new Date(updatedUser.resetPasswordExpires).toLocaleString());

    // URL de réinitialisation qui pointe vers le frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const resetURL = `${frontendUrl}/reset-password/${token}`;

    const logoAttachment = getLogoAttachment();
    const attachments = logoAttachment ? [logoAttachment] : [];
    const emailContent = buildPasswordResetEmail({
      user,
      resetUrl: resetURL,
      logoCid: logoAttachment ? logoAttachment.cid : null
    });

    await sendMail(user.email, "Reinitialisation du mot de passe", emailContent, true, undefined, attachments);
    console.log(" Email envoyé avec succès !");

    res.status(200).json({ message: "Email de réinitialisation envoyé" });
  } catch (error) {
    console.error(" Erreur lors de la demande de réinitialisation :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

passwordController.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    console.log(" Token reçu pour réinitialisation :", token);

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() } // Vérifie avec une vraie date
    }).exec();

    if (!user) {
      console.log(" Token invalide ou expiré !");
      return res.status(400).json({ message: "Token invalide ou expiré" });
    }

    console.log(" Token valide pour :", user.email);

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(" Mot de passe mis à jour avec succès !");
    res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
  } catch (error) {
    console.error(" Erreur lors de la réinitialisation du mot de passe :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

passwordController.showResetPasswordForm = async (req, res) => {
  try {
    const { token } = req.params;
    console.log(" Vérification du token :", token);

    // Vérifier si un utilisateur avec ce token existe et si le token n'est pas expiré
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    }).exec();

    if (!user) {
      console.log(" Token invalide ou expiré !");
      return res.status(400).json({ message: "Token invalide ou expiré" });
    }

    console.log(" Token valide pour :", user.email);

    // Retourner une réponse indiquant que le token est valide
    res.status(200).json({ message: "Token valide", isTokenValid: true });
  } catch (error) {
    console.error("Erreur lors de la vérification du token :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = passwordController;
