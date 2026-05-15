const CompetitionResult = require('../models/competitionResult.model');
const Competition = require('../models/competition.model');
const Nageur = require('../models/nageur.model');
const Entraineur = require('../models/entraineur.model');
const { updateRankingsForDate } = require('../utils/rankingEngine');
const { ensureCoachSwimmerAccess, getCoachSwimmerIds } = require('../utils/coachScope');

const competitionResultController = {};

const parseTimeToSeconds = (timeStr) => {
  if (!timeStr) return null;
  try {
    const value = String(timeStr).trim();
    if (value.includes(':')) {
      const parts = value.split(':');
      if (parts.length === 3) {
        const hours = parseFloat(parts[0]);
        const mins = parseFloat(parts[1]);
        const secs = parseFloat(parts[2]);
        return hours * 3600 + mins * 60 + secs;
      }
      const mins = parseFloat(parts[0]);
      const secs = parseFloat(parts[1]);
      return mins * 60 + secs;
    }
    const total = parseFloat(value);
    return Number.isNaN(total) ? null : total;
  } catch (err) {
    return null;
  }
};

const sanitizeNumber = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
};

// POST /competition-results (coach only)
competitionResultController.createResult = async (req, res) => {
  try {
    const {
      competitionId,
      nageurId,
      score,
      rank,
      time,
      distance,
      stroke,
      category,
      performanceMetrics,
      notes,
      resultDate
    } = req.body;

    if (!competitionId || !nageurId || score === undefined || rank === undefined) {
      return res.status(400).json({ message: 'Champs obligatoires manquants.' });
    }

    const competition = await Competition.findById(competitionId);
    if (!competition) return res.status(404).json({ message: 'Compétition non trouvée.' });

    const nageur = await Nageur.findById(nageurId);
    if (!nageur) return res.status(404).json({ message: 'Nageur non trouvé.' });

    const coach = await Entraineur.findOne({ utilisateur: req.user.userId });
    if (!coach) return res.status(403).json({ message: 'Coach non identifié.' });
    const allowed = await ensureCoachSwimmerAccess(req.user.userId, nageurId);
    if (!allowed) return res.status(403).json({ message: 'Acces interdit.' });

    const result = new CompetitionResult({
      competition: competition._id,
      nageur: nageur._id,
      user: nageur.utilisateur,
      coach: coach._id,
      score: sanitizeNumber(score, 0),
      rank: sanitizeNumber(rank, 1),
      time: time || '',
      timeSeconds: parseTimeToSeconds(time),
      distance: sanitizeNumber(distance, null),
      stroke: stroke || '',
      category: category || '',
      performanceMetrics: {
        techniqueScore: sanitizeNumber(performanceMetrics?.techniqueScore, null),
        enduranceScore: sanitizeNumber(performanceMetrics?.enduranceScore, null),
        sprintScore: sanitizeNumber(performanceMetrics?.sprintScore, null),
        strokeEfficiency: sanitizeNumber(performanceMetrics?.strokeEfficiency, null),
        consistencyScore: sanitizeNumber(performanceMetrics?.consistencyScore, null)
      },
      notes: notes || '',
      resultDate: resultDate ? new Date(resultDate) : new Date()
    });

    await result.save();
    await updateRankingsForDate(result.resultDate);
    res.status(201).json({ message: 'Résultat enregistré.', result });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création.', error: error.message });
  }
};

// GET /competition-results/user/:userId
competitionResultController.getResultsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user?.role === 'ENTRAINEUR') {
      const nageur = await Nageur.findOne({ utilisateur: userId });
      if (!nageur) return res.status(404).json({ message: 'Nageur non trouvé.' });
      const allowed = await ensureCoachSwimmerAccess(req.user.userId, nageur._id);
      if (!allowed) return res.status(403).json({ message: 'Acces interdit.' });
    }
    const results = await CompetitionResult.find({ user: userId })
      .populate('competition', 'nom date lieu')
      .populate('nageur', 'utilisateur')
      .sort({ resultDate: -1 });
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération.', error: error.message });
  }
};

// GET /competition-results/competition/:competitionId
competitionResultController.getResultsByCompetition = async (req, res) => {
  try {
    const { competitionId } = req.params;
    const filter = { competition: competitionId };
    if (req.user?.role === 'ENTRAINEUR') {
      const swimmerIds = await getCoachSwimmerIds(req.user.userId);
      if (!swimmerIds.length) return res.status(200).json([]);
      filter.nageur = { $in: swimmerIds };
    }
    const results = await CompetitionResult.find(filter)
      .populate('nageur', 'utilisateur')
      .populate('user', 'nom prenom email')
      .sort({ rank: 1 });
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération.', error: error.message });
  }
};

module.exports = competitionResultController;
