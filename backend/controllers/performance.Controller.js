const Performance = require('../models/performance.model');
const Nageur = require('../models/nageur.model');

const performanceController = {};

// GET /performances - Get all or filtered
performanceController.getAll = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'NAGEUR') {
      const nageur = await Nageur.findOne({ utilisateur: req.user.userId });
      if (nageur) filter.nageur = nageur._id;
    }

    if (req.query.nageurId) filter.nageur = req.query.nageurId;
    if (req.query.type) filter.type = req.query.type;

    const performances = await Performance.find(filter)
      .populate({ path: 'nageur', populate: { path: 'utilisateur', select: 'nom prenom' } })
      .populate('competition', 'nom date lieu')
      .populate('entrainement', 'titre date')
      .populate('addedBy', 'nom prenom')
      .sort({ date: -1 });

    res.json(performances);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// POST /performances
performanceController.create = async (req, res) => {
  try {
    const { nageur, competition, entrainement, type, epreuve, temps, distance, style, classement, notes, date } = req.body;

    const perf = new Performance({
      nageur, competition, entrainement, type, epreuve, temps, distance, style, classement, notes,
      addedBy: req.user.userId,
      date: date || new Date()
    });

    await perf.save();
    res.status(201).json({ message: 'Performance ajoutée !', performance: perf });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// PUT /performances/:id
performanceController.update = async (req, res) => {
  try {
    const perf = await Performance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!perf) return res.status(404).json({ message: 'Performance introuvable.' });
    res.json({ message: 'Performance mise à jour !', performance: perf });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// DELETE /performances/:id
performanceController.delete = async (req, res) => {
  try {
    const perf = await Performance.findByIdAndDelete(req.params.id);
    if (!perf) return res.status(404).json({ message: 'Performance introuvable.' });
    res.json({ message: 'Performance supprimée !' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

module.exports = performanceController;
