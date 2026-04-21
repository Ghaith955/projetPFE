const Entrainement = require('../models/entrainement.model');
const Nageur = require('../models/nageur.model');
const { notifyNageurs } = require('../utils/notificationHelper');

const entrainementController = {};

// GET all
entrainementController.getAllEntrainements = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role === 'NAGEUR') {
      const nageur = await Nageur.findOne({ utilisateur: req.user.userId });
      if (!nageur) return res.status(200).json([]);
      filter.nageurs = nageur._id;
    }

    const entrainements = await Entrainement.find(filter)
      .populate('entraineur')
      .populate('nageurs')
      .sort({ date: 1 });
    res.status(200).json(entrainements);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération.', error: error.message });
  }
};

// GET by id
entrainementController.getEntrainementById = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user?.role === 'NAGEUR') {
      const nageur = await Nageur.findOne({ utilisateur: req.user.userId });
      if (!nageur) return res.status(404).json({ message: 'Entraînement non trouvé.' });
      filter.nageurs = nageur._id;
    }

    const entrainement = await Entrainement.findOne(filter)
      .populate('entraineur')
      .populate('nageurs');
    if (!entrainement) return res.status(404).json({ message: 'Entraînement non trouvé.' });
    res.status(200).json(entrainement);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// POST create
entrainementController.createEntrainement = async (req, res) => {
  try {
    const { titre, date, heureDebut, heureFin, type, intensite, duree, lieu, description, entraineur, statut, nageurs } = req.body;
    const entrainement = new Entrainement({
      titre, date, heureDebut, heureFin, type, intensite, duree, lieu, description, entraineur, statut, nageurs
    });
    await entrainement.save();

    await notifyNageurs({
      nageurIds: Array.isArray(nageurs) ? nageurs : [],
      title: 'Nouvel entrainement',
      message: `Vous etes ajoute a l'entrainement "${titre}" le ${new Date(date).toLocaleDateString('fr-FR')} de ${heureDebut} a ${heureFin}.`,
      type: 'planning',
      resourceType: 'Entrainement',
      resourceId: entrainement._id,
      createdBy: req.user.userId
    });

    res.status(201).json({ message: 'Entraînement créé avec succès!', entrainement });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création.', error: error.message });
  }
};

// PUT update
entrainementController.updateEntrainement = async (req, res) => {
  try {
    const { titre, date, heureDebut, heureFin, type, intensite, duree, lieu, description, statut, nageurs } = req.body;
    const entrainement = await Entrainement.findByIdAndUpdate(
      req.params.id,
      { titre, date, heureDebut, heureFin, type, intensite, duree, lieu, description, statut, nageurs },
      { new: true }
    );
    if (!entrainement) return res.status(404).json({ message: 'Entraînement non trouvé.' });
    res.status(200).json({ message: 'Entraînement mis à jour!', entrainement });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour.', error: error.message });
  }
};

// DELETE
entrainementController.deleteEntrainement = async (req, res) => {
  try {
    const entrainement = await Entrainement.findByIdAndDelete(req.params.id);
    if (!entrainement) return res.status(404).json({ message: 'Entraînement non trouvé.' });
    res.status(200).json({ message: 'Entraînement supprimé!' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression.', error: error.message });
  }
};

module.exports = entrainementController;
