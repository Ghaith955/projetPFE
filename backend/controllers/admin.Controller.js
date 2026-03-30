const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

const adminController = {};

// GET all users
adminController.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ dateCreation: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération.', error: error.message });
  }
};

// GET single user
adminController.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// POST create user
adminController.registerAdmin = async (req, res) => {
  try {
    const { nom, prenom, email, password, phone, role, isActive } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "L'utilisateur existe déjà." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let imageprofile = '';
    if (req.file) {
      imageprofile = 'http://localhost:3300/uploads/' + req.file.filename;
    }

    const newUser = new User({
      nom, prenom, email,
      password: hashedPassword,
      phone, imageprofile,
      role: role || null,
      isActive: isActive !== undefined ? isActive : true,
      active: true,
      statut: 'actif'
    });
    await newUser.save();

    res.status(201).json({ message: 'Utilisateur créé avec succès!', user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création.", error: error.message });
  }
};

// PUT update user
adminController.updateUser = async (req, res) => {
  try {
    const { nom, prenom, email, phone, role, isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { nom, prenom, email, phone, role, isActive },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    res.status(200).json({ message: 'Utilisateur mis à jour!', user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour.', error: error.message });
  }
};

// PATCH toggle active
adminController.toggleActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({ message: `Compte ${user.isActive ? 'activé' : 'désactivé'}!`, user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// DELETE user
adminController.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    res.status(200).json({ message: 'Utilisateur supprimé avec succès!' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression.', error: error.message });
  }
};

module.exports = adminController;
