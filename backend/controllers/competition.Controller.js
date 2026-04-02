const Competition = require('../models/competition.model');

const competitionController = {};

// GET all competitions
competitionController.getAllCompetitions = async (req, res) => {
  try {
    const competitions = await Competition.find().sort({ date: 1 });
    res.status(200).json(competitions);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération.', error: error.message });
  }
};

// GET single competition
competitionController.getCompetitionById = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id).populate('nageurs');
    if (!competition) return res.status(404).json({ message: 'Compétition non trouvée.' });
    res.status(200).json(competition);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// POST create competition
competitionController.createCompetition = async (req, res) => {
  try {
    const { nom, date, lieu, description, niveauRequis, statut, nageurs } = req.body;
    const competition = new Competition({ nom, date, lieu, description, niveauRequis, statut, nageurs });
    await competition.save();
    res.status(201).json({ message: 'Compétition créée avec succès!', competition });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création.', error: error.message });
  }
};

// PUT update competition
competitionController.updateCompetition = async (req, res) => {
  try {
    const { nom, date, lieu, description, niveauRequis, statut, nageurs } = req.body;
    const competition = await Competition.findByIdAndUpdate(
      req.params.id,
      { nom, date, lieu, description, niveauRequis, statut, nageurs },
      { new: true }
    );
    if (!competition) return res.status(404).json({ message: 'Compétition non trouvée.' });
    res.status(200).json({ message: 'Compétition mise à jour!', competition });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour.', error: error.message });
  }
};

// DELETE competition
competitionController.deleteCompetition = async (req, res) => {
  try {
    const competition = await Competition.findByIdAndDelete(req.params.id);
    if (!competition) return res.status(404).json({ message: 'Compétition non trouvée.' });
    res.status(200).json({ message: 'Compétition supprimée avec succès!' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression.', error: error.message });
  }
};

module.exports = competitionController;
