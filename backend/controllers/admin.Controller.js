// controllers/user.controller.js
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

const adminController = {};

// Création d'un utilisateur générique
adminController.registerAdmin = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      email,
      password,
      phone,
      
    } = req.body;

    // Vérification si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "L'utilisateur existe déjà." });
    }

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Gestion de l'image de profil
    let imageprofile = '';
    if (req.file) {
      imageprofile = 'http://localhost:3300/uploads/' + req.file.filename;
    }

    // Création du nouvel utilisateur
    const newUser = new User({
      nom,
      prenom,
      email,
      password: hashedPassword,
      phone,
      imageprofile,
      isActive: false, // actif après confirmation
    });

    await newUser.save();

    res.status(201).json({
      message: "Utilisateur inscrit avec succès !",
      user: newUser
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur lors de l'inscription de l'utilisateur.",
      error: error.message
    });
  }
};

module.exports = adminController;