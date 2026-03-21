// controllers/entraineur.controller.js
const Entraineur = require('../models/entraineur.model');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

const entraineurController = {};

entraineurController.registerEntraineur = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      email,
      password,
      phone,
      experience,
      specialites,
      club,
      certifications
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

    // Création de l'utilisateur
    const newUser = new User({
      nom,
      prenom,
      email,
      password: hashedPassword,
      phone,
      imageprofile,
      isActive: false, // le compte sera inactif tant qu’il n’est pas confirmé
    });

    await newUser.save();

    // Création de l'entraîneur lié à l'utilisateur
    const newEntraineur = new Entraineur({
      utilisateur: newUser._id,
      experience,
      specialites,
      club,
      certifications
    });

    await newEntraineur.save();

    res.status(201).json({
      message: "Entraîneur inscrit avec succès !",
      user: newUser,
      entraineur: newEntraineur
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur lors de l'inscription de l'entraîneur.",
      error: error.message
    });
  }
};

module.exports = entraineurController;