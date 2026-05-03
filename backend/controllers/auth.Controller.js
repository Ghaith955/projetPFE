const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { sendMail } = require('../utils/sendEmail');
const {
  buildPendingUserEmail,
  buildAdminPendingEmail,
  getLogoAttachment
} = require('../utils/emailTemplates');

const authController = {};

// POST /auth/login
authController.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // enabling bypass wa9teyan yaani

    const isInactive = user.isActive === false;
    const isPending = user.status === 'PENDING';
    if (isInactive || (isPending && user.isActive !== true)) {
      return res.status(403).json({ message: 'Votre compte n\'est pas encore activé.' });
    }


    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Connexion réussie.',
      token,
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        phone: user.phone,
        role: user.role,
        imageprofile: user.imageprofile,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// POST /auth/logout
authController.logout = (req, res) => {
  res.status(200).json({ message: 'Déconnexion réussie.' });
};

// GET /auth/me
authController.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    let roleData = null;
    if (user.role === 'NAGEUR') {
      roleData = await require('../models/nageur.model').findOne({ utilisateur: user._id })
        .populate('entraineur'); // Optionally populate
    } else if (user.role === 'ENTRAINEUR') {
      roleData = await require('../models/entraineur.model').findOne({ utilisateur: user._id })
        .populate('nageurs');
    }

    const responseData = { ...user.toObject(), roleData };
    res.json(responseData);
  } catch (error) {
    console.error('Erreur getMe:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// PUT /auth/profile
authController.updateProfile = async (req, res) => {
  try {
    const { nom, prenom, phone, preferences } = req.body;
    const updateData = {};
    if (nom) updateData.nom = nom;
    if (prenom) updateData.prenom = prenom;
    if (phone) updateData.phone = phone;
    if (preferences) updateData.preferences = preferences;

    if (req.file) {
      updateData.imageprofile = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');

    let updatedRoleData = null;
    if (user.role === 'NAGEUR') {
      const Nageur = require('../models/nageur.model');
      const nageurUpdate = {};
      if (req.body.age) nageurUpdate.age = req.body.age;
      if (req.body.sexe) nageurUpdate.sexe = req.body.sexe;
      if (req.body.club) nageurUpdate.club = req.body.club;
      if (req.body.poids) nageurUpdate.poid = req.body.poids;
      if (req.body.specialites) {
        try { nageurUpdate.specialite = JSON.parse(req.body.specialites); } catch (e) { }
      }
      updatedRoleData = await Nageur.findOneAndUpdate({ utilisateur: user._id }, nageurUpdate, { new: true });
    } else if (user.role === 'ENTRAINEUR') {
      const Entraineur = require('../models/entraineur.model');
      const entraineurUpdate = {};
      if (req.body.experience) entraineurUpdate.experience = req.body.experience;
      if (req.body.numeroCertification) entraineurUpdate.numeroCertification = req.body.numeroCertification;
      if (req.body.diplome) entraineurUpdate.diplome = req.body.diplome;
      if (req.body.specialites) {
        try { entraineurUpdate.specialites = JSON.parse(req.body.specialites); } catch (e) { }
      }
      updatedRoleData = await Entraineur.findOneAndUpdate({ utilisateur: user._id }, entraineurUpdate, { new: true });
    }

    res.json({ message: 'Profil mis à jour.', user: { ...user.toObject(), roleData: updatedRoleData } });
  } catch (error) {
    console.error('Erreur updateProfile:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// PUT /auth/change-password
authController.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const user = await User.findById(req.user.userId);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch (error) {
    console.error('Erreur changePassword:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// POST /auth/register
authController.register = async (req, res) => {
  try {
    const { nom, prenom, email, password, phone, role } = req.body;

    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis.' });
    }

    const validRoles = ['RESPONSABLE', 'ENTRAINEUR', 'NAGEUR'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let imageprofile = '';
    if (req.file) {
      imageprofile = `/uploads/${req.file.filename}`;
    }

    const newUser = new User({
      nom,
      prenom,
      email,
      password: hashedPassword,
      phone: phone || null,
      imageprofile,
      role,
      status: 'PENDING',
      // Require admin activation
      isActive: false
    });

    await newUser.save();

    if (role === 'NAGEUR') {
      const Nageur = require('../models/nageur.model');
      const specialiteArray = req.body.specialites ? JSON.parse(req.body.specialites) : [];
      const newNageur = new Nageur({
        utilisateur: newUser._id,
        age: req.body.age || 18,
        sexe: req.body.sexe || 'Masculin',
        poid: req.body.poids || '70',
        specialite: specialiteArray,
        club: req.body.club || ''
      });
      await newNageur.save();
    } else if (role === 'ENTRAINEUR') {
      const Entraineur = require('../models/entraineur.model');
      const specialiteArray = req.body.specialites ? JSON.parse(req.body.specialites) : [];
      const newEntraineur = new Entraineur({
        utilisateur: newUser._id,
        experience: req.body.experience || 0,
        specialites: specialiteArray,
        numeroCertification: req.body.numeroCertification || '',
        diplome: req.body.diplome || ''
      });
      await newEntraineur.save();
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    const logoAttachment = getLogoAttachment();
    const attachments = logoAttachment ? [logoAttachment] : [];

    const userHtml = buildPendingUserEmail({
      user: newUser,
      frontendUrl,
      logoCid: logoAttachment ? logoAttachment.cid : null
    });

    const adminHtml = adminEmail
      ? buildAdminPendingEmail({
          user: newUser,
          dashboardUrl: `${frontendUrl}/dashboard`,
          logoCid: logoAttachment ? logoAttachment.cid : null
        })
      : null;

    await Promise.allSettled([
      sendMail(newUser.email, 'Inscription en attente de validation', userHtml, true, undefined, attachments),
      adminHtml ? sendMail(adminEmail, "Nouvelle demande d'inscription", adminHtml, true, undefined, attachments) : Promise.resolve()
    ]);

    res.status(201).json({
      message: 'Inscription enregistree. En attente d\'approbation.',
      user: {
        id: newUser._id,
        nom: newUser.nom,
        prenom: newUser.prenom,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = authController;
