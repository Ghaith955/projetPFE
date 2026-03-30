const Entraineur = require('../models/entraineur.model');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

const entraineurController = {};

// GET all entraineurs
entraineurController.getAllEntraineurs = async (req, res) => {
  try {
    const entraineurs = await Entraineur.find().populate('utilisateur', 'nom prenom email phone imageprofile isActive');
    res.status(200).json(entraineurs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des entraîneurs.', error: error.message });
  }
};

// GET single entraineur
entraineurController.getEntraineurById = async (req, res) => {
  try {
    const entraineur = await Entraineur.findById(req.params.id).populate('utilisateur', 'nom prenom email phone imageprofile');
    if (!entraineur) return res.status(404).json({ message: 'Entraîneur non trouvé.' });
    res.status(200).json(entraineur);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// POST register entraineur
entraineurController.registerEntraineur = async (req, res) => {
  try {
    const { nom, prenom, email, password, phone, experience, specialites,  certifications } = req.body;

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
      isActive: true,
      active: true,
      statut: 'actif'
    });
    await newUser.save();

    const newEntraineur = new Entraineur({
      utilisateur: newUser._id,
      experience,
      specialites: Array.isArray(specialites) ? specialites : [specialites],
      
      certifications: certifications || []
    });
    await newEntraineur.save();

    res.status(201).json({ message: 'Entraîneur inscrit avec succès!', entraineur: newEntraineur });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'inscription.", error: error.message });
  }
};

// PUT update entraineur
entraineurController.updateEntraineur = async (req, res) => {
  try {
    const { nom, prenom, email, phone, experience, specialites, club } = req.body;

    const entraineur = await Entraineur.findById(req.params.id);
    if (!entraineur) return res.status(404).json({ message: 'Entraîneur non trouvé.' });

    await User.findByIdAndUpdate(entraineur.utilisateur, { nom, prenom, email, phone });

    const updated = await Entraineur.findByIdAndUpdate(
      req.params.id,
      { experience, specialites: Array.isArray(specialites) ? specialites : [specialites], club },
      { new: true }
    ).populate('utilisateur', 'nom prenom email phone imageprofile');

    res.status(200).json({ message: 'Entraîneur mis à jour!', entraineur: updated });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour.', error: error.message });
  }
};

// DELETE entraineur
entraineurController.deleteEntraineur = async (req, res) => {
  try {
    const entraineur = await Entraineur.findById(req.params.id);
    if (!entraineur) return res.status(404).json({ message: 'Entraîneur non trouvé.' });

    await User.findByIdAndDelete(entraineur.utilisateur);
    await Entraineur.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Entraîneur supprimé avec succès!' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression.', error: error.message });
  }
};

module.exports = entraineurController;