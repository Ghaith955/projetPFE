const Nageur = require('../models/nageur.model');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

const nageurController = {};


nageurController.registerNageur = async (req, res) => {
  try {
    const { nom, prenom, email, password, phone, age, sexe, poid, specialite, competitions } = req.body;

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
      nom,
      prenom,
      email,
      password: hashedPassword,
      phone,
      imageprofile,
      isActive: true,
      active: true,
      statut: 'actif'
    });
    await newUser.save();

    const newNageur = new Nageur({
      utilisateur: newUser._id,
      age,
      sexe,
      poid,
      specialite: Array.isArray(specialite) ? specialite : [specialite],
      competitions: competitions || []
    });
    await newNageur.save();

    res.status(201).json({ message: 'Nageur inscrit avec succès!', nageur: newNageur });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'inscription.", error: error.message });
  }
};

// GET all nageurs
nageurController.getAllNageurs = async (req, res) => {
  try {
    const nageurs = await Nageur.find().populate('utilisateur', 'nom prenom email phone imageprofile isActive');
    res.status(200).json(nageurs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des nageurs.', error: error.message });
  }
};

// GET single nageur
nageurController.getNageurById = async (req, res) => {
  try {
    const nageur = await Nageur.findById(req.params.id).populate('utilisateur', 'nom prenom email phone imageprofile');
    if (!nageur) return res.status(404).json({ message: 'Nageur non trouvé.' });
    res.status(200).json(nageur);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// POST register nageur


// PUT update nageur
nageurController.updateNageur = async (req, res) => {
  try {
    const { nom, prenom, email, phone, age, sexe, poid, specialite } = req.body;

    const nageur = await Nageur.findById(req.params.id);
    if (!nageur) return res.status(404).json({ message: 'Nageur non trouvé.' });

    // Update user info
    await User.findByIdAndUpdate(nageur.utilisateur, {
      nom, prenom, email, phone
    });

    // Update nageur info
    const updatedNageur = await Nageur.findByIdAndUpdate(
      req.params.id,
      { age, sexe, poid, specialite: Array.isArray(specialite) ? specialite : [specialite] },
      { new: true }
    ).populate('utilisateur', 'nom prenom email phone imageprofile');

    res.status(200).json({ message: 'Nageur mis à jour avec succès!', nageur: updatedNageur });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour.', error: error.message });
  }
};

// DELETE nageur
nageurController.deleteNageur = async (req, res) => {
  try {
    const nageur = await Nageur.findById(req.params.id);
    if (!nageur) return res.status(404).json({ message: 'Nageur non trouvé.' });

    await User.findByIdAndDelete(nageur.utilisateur);
    await Nageur.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Nageur supprimé avec succès!' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression.', error: error.message });
  }
};

module.exports = nageurController;