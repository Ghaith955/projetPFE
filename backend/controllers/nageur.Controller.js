const Nageur = require('../models/nageur.model');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

// Contrôleur pour l'inscription d'un nageur
const nageurController = {};

nageurController.registerNageur = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      email,
      password,
      phone,
      age,
      sexe,
      poid,
      specialite,
      competitions
    } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "L'utilisateur existe déjà." });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Gérer l'image de profil
    let imageprofile = '';
    if (req.file) {
      imageprofile = 'http://localhost:3300/uploads/' + req.file.filename;
    }

    // Créer l'utilisateur
    const newUser = new User({
      nom,
      prenom,
      email,
      password: hashedPassword,
      phone,
      imageprofile,
      isActive: false, // le compte est inactif tant que non confirmé
    });

    await newUser.save();

    // Créer le nageur lié à l'utilisateur
    const newNageur = new Nageur({
      utilisateur: newUser._id,
      age,
      sexe,
      poid,
      specialite,
      competitions
    });

    await newNageur.save();

    res.status(201).json({
      message: "Nageur inscrit avec succès !",
      user: newUser,
      nageur: newNageur
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur lors de l'inscription du nageur.",
      error: error.message
    });
  }
};

module.exports = nageurController;