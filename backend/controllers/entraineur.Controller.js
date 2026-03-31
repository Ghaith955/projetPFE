const Entraineur = require('../models/entraineur.model');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

const entraineurController = {};

// GET /entraineurs
entraineurController.getAllEntraineurs = async (req, res) => {
  try {
    const entraineurs = await Entraineur.find()
      .populate('utilisateur', 'nom prenom email phone imageprofile isActive')
      .populate({ path: 'nageurs', populate: { path: 'utilisateur', select: 'nom prenom' } });
    res.status(200).json(entraineurs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// GET /entraineurs/:id
entraineurController.getEntraineurById = async (req, res) => {
  try {
    const entraineur = await Entraineur.findById(req.params.id)
      .populate('utilisateur', 'nom prenom email phone imageprofile')
      .populate({ path: 'nageurs', populate: { path: 'utilisateur', select: 'nom prenom email' } });
    if (!entraineur) return res.status(404).json({ message: 'Entraîneur non trouvé.' });
    res.status(200).json(entraineur);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// POST /entraineurs/register
entraineurController.registerEntraineur = async (req, res) => {
  try {
    const { nom, prenom, email, password, phone, experience, specialites, certifications, numeroCertification, diplome } = req.body;

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
      role: 'ENTRAINEUR',
      isActive: true
    });
    await newUser.save();

    let parsedSpecialites = [];
    if (specialites) {
      try { parsedSpecialites = JSON.parse(specialites); } 
      catch(e) { parsedSpecialites = Array.isArray(specialites) ? specialites : [specialites]; }
    }

    const newEntraineur = new Entraineur({
      utilisateur: newUser._id,
      experience: Number(experience) || 0,
      specialites: parsedSpecialites,
      certifications: certifications || [],
      numeroCertification: numeroCertification || '',
      diplome: diplome || ''
    });
    await newEntraineur.save();

    res.status(201).json({ message: 'Entraîneur inscrit avec succès !', entraineur: newEntraineur });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// PUT /entraineurs/:id
entraineurController.updateEntraineur = async (req, res) => {
  try {
    const { nom, prenom, email, phone, experience, specialites, numeroCertification, diplome } = req.body;

    const entraineur = await Entraineur.findById(req.params.id);
    if (!entraineur) return res.status(404).json({ message: 'Entraîneur non trouvé.' });

    const userUpdate = { nom, prenom, email, phone };
    if (req.file) userUpdate.imageprofile = `/uploads/${req.file.filename}`;

    await User.findByIdAndUpdate(entraineur.utilisateur, userUpdate);

    let parsedSpecialites = [];
    if (specialites) {
      try { parsedSpecialites = JSON.parse(specialites); } 
      catch(e) { parsedSpecialites = Array.isArray(specialites) ? specialites : [specialites]; }
    }

    const updated = await Entraineur.findByIdAndUpdate(
      req.params.id,
      { 
        experience, 
        specialites: parsedSpecialites,
        ...(numeroCertification !== undefined && { numeroCertification }),
        ...(diplome !== undefined && { diplome })
      },
      { new: true }
    ).populate('utilisateur', 'nom prenom email phone imageprofile');

    res.status(200).json({ message: 'Entraîneur mis à jour !', entraineur: updated });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// DELETE /entraineurs/:id
entraineurController.deleteEntraineur = async (req, res) => {
  try {
    const entraineur = await Entraineur.findById(req.params.id);
    if (!entraineur) return res.status(404).json({ message: 'Entraîneur non trouvé.' });

    await User.findByIdAndDelete(entraineur.utilisateur);
    await Entraineur.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Entraîneur supprimé avec succès !' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

module.exports = entraineurController;