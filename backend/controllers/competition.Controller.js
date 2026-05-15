const Competition = require('../models/competition.model');
const { notifyNageurs } = require('../utils/notificationHelper');
const Entraineur = require('../models/entraineur.model');
const Nageur = require('../models/nageur.model');

const competitionController = {};

// GET all competitions
competitionController.getAllCompetitions = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role === 'ENTRAINEUR') {
      const coach = await Entraineur.findOne({ utilisateur: req.user.userId });
      if (!coach) return res.status(200).json([]);
      filter.nageurs = { $in: coach.nageurs || [] };
    }
    // NAGEUR privacy: only see competitions where they are registered
    if (req.user?.role === 'NAGEUR') {
      const nageur = await Nageur.findOne({ utilisateur: req.user.userId });
      if (!nageur) return res.status(200).json([]);
      filter.nageurs = nageur._id;
    }
    const competitions = await Competition.find(filter).sort({ date: 1 });

    // Scrub nageurs list for coaches — only show their own swimmers
    if (req.user?.role === 'ENTRAINEUR') {
      const coach = await Entraineur.findOne({ utilisateur: req.user.userId });
      const coachSwimmerIds = (coach?.nageurs || []).map(String);
      const scrubbed = competitions.map(c => {
        const obj = c.toObject ? c.toObject() : { ...c };
        obj.nageurs = (obj.nageurs || []).filter(id => coachSwimmerIds.includes(String(id)));
        return obj;
      });
      return res.status(200).json(scrubbed);
    }
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
    if (req.user?.role === 'ENTRAINEUR') {
      const coach = await Entraineur.findOne({ utilisateur: req.user.userId });
      const allowed = coach?.nageurs?.some((id) => competition.nageurs?.some((n) => String(n._id || n) === String(id)));
      if (!coach || !allowed) return res.status(403).json({ message: 'Acces interdit.' });
      // Scrub nageurs list to only show coach's swimmers
      const coachSwimmerIds = (coach.nageurs || []).map(String);
      const obj = competition.toObject();
      obj.nageurs = (obj.nageurs || []).filter(n => coachSwimmerIds.includes(String(n._id || n)));
      return res.status(200).json(obj);
    }
    // NAGEUR privacy: check they are registered
    if (req.user?.role === 'NAGEUR') {
      const nageur = await Nageur.findOne({ utilisateur: req.user.userId });
      if (!nageur) return res.status(403).json({ message: 'Acces interdit.' });
      const isRegistered = competition.nageurs?.some(n => String(n._id || n) === String(nageur._id));
      if (!isRegistered) return res.status(403).json({ message: 'Acces interdit.' });
    }
    res.status(200).json(competition);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// POST create competition
competitionController.createCompetition = async (req, res) => {
  try {
    const { nom, date, lieu, description, niveauRequis, statut, nageurs } = req.body;
    if (req.user?.role === 'ENTRAINEUR') {
      const coach = await Entraineur.findOne({ utilisateur: req.user.userId });
      const swimmerIds = coach?.nageurs || [];
      const requested = Array.isArray(nageurs) ? nageurs : [];
      const allowed = requested.every((id) => swimmerIds.some((sid) => String(sid) === String(id)));
      if (!coach || !allowed) return res.status(403).json({ message: 'Acces interdit.' });
    }
    const competition = new Competition({ nom, date, lieu, description, niveauRequis, statut, nageurs });
    await competition.save();

    await notifyNageurs({
      nageurIds: Array.isArray(nageurs) ? nageurs : [],
      title: 'Nouvelle competition',
      message: `Vous etes inscrit a la competition "${nom}" prevue le ${new Date(date).toLocaleDateString('fr-FR')}.`,
      type: 'competition',
      resourceType: 'Competition',
      resourceId: competition._id,
      createdBy: req.user.userId
    });

    res.status(201).json({ message: 'Compétition créée avec succès!', competition });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création.', error: error.message });
  }
};

// PUT update competition
competitionController.updateCompetition = async (req, res) => {
  try {
    const { nom, date, lieu, description, niveauRequis, statut, nageurs } = req.body;
    if (req.user?.role === 'ENTRAINEUR') {
      const coach = await Entraineur.findOne({ utilisateur: req.user.userId });
      const swimmerIds = coach?.nageurs || [];
      const requested = Array.isArray(nageurs) ? nageurs : [];
      const allowed = requested.every((id) => swimmerIds.some((sid) => String(sid) === String(id)));
      if (!coach || !allowed) return res.status(403).json({ message: 'Acces interdit.' });
    }
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
