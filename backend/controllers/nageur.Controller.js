const Nageur = require('../models/nageur.model');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

const nageurController = {};

// POST /nageurs/register
nageurController.registerNageur = async (req, res) => {
  try {
    const { nom, prenom, email, password, phone, age, sexe, poid, specialite, club } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    let imageprofile = '';
    if (req.file) {
      imageprofile = `/uploads/${req.file.filename}`;
    }

    const newUser = new User({
      nom, prenom, email,
      password: hashedPassword,
      phone: phone || null,
      imageprofile,
      role: 'NAGEUR',
      isActive: true
    });
    await newUser.save();

    let parsedSpecialites = [];
    if (specialite) {
      try { parsedSpecialites = JSON.parse(specialite); } 
      catch(e) { parsedSpecialites = Array.isArray(specialite) ? specialite : [specialite]; }
    }

    const newNageur = new Nageur({
      utilisateur: newUser._id,
      age: Number(age),
      sexe,
      poid,
      specialite: parsedSpecialites,
      club: club || ''
    });
    await newNageur.save();

    res.status(201).json({ message: 'Nageur inscrit avec succès !', nageur: newNageur });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'inscription.', error: error.message });
  }
};

// GET /nageurs
nageurController.getAllNageurs = async (req, res) => {
  try {
    const nageurs = await Nageur.find()
      .populate('utilisateur', 'nom prenom email phone imageprofile isActive')
      .populate('entraineur');
    res.status(200).json(nageurs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// GET /nageurs/:id
nageurController.getNageurById = async (req, res) => {
  try {
    const nageur = await Nageur.findById(req.params.id)
      .populate('utilisateur', 'nom prenom email phone imageprofile')
      .populate('entraineur');
    if (!nageur) return res.status(404).json({ message: 'Nageur non trouvé.' });
    res.status(200).json(nageur);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// PUT /nageurs/:id
nageurController.updateNageur = async (req, res) => {
  try {
    const { nom, prenom, email, phone, age, sexe, poid, specialite, club } = req.body;

    const nageur = await Nageur.findById(req.params.id);
    if (!nageur) return res.status(404).json({ message: 'Nageur non trouvé.' });

    const userUpdate = { nom, prenom, email, phone };
    if (req.file) userUpdate.imageprofile = `/uploads/${req.file.filename}`;

    await User.findByIdAndUpdate(nageur.utilisateur, userUpdate);

    let parsedSpecialites = [];
    if (specialite) {
      try { parsedSpecialites = JSON.parse(specialite); } 
      catch(e) { parsedSpecialites = Array.isArray(specialite) ? specialite : [specialite]; }
    }

    const updated = await Nageur.findByIdAndUpdate(
      req.params.id,
      { age, sexe, poid, specialite: parsedSpecialites, club: club || '' },
      { new: true }
    ).populate('utilisateur', 'nom prenom email phone imageprofile');

    res.status(200).json({ message: 'Nageur mis à jour !', nageur: updated });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// DELETE /nageurs/:id
nageurController.deleteNageur = async (req, res) => {
  try {
    const nageur = await Nageur.findById(req.params.id);
    if (!nageur) return res.status(404).json({ message: 'Nageur non trouvé.' });

    await User.findByIdAndDelete(nageur.utilisateur);
    await Nageur.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Nageur supprimé avec succès !' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

module.exports = nageurController;