const Performance = require('../models/performance.model');
const Nageur = require('../models/nageur.model');
const { evaluateRules }  = require('../utils/idssRuleEngine');
const { updateBaseline } = require('../utils/idssBaselineUpdater');
const IDSSDecision       = require('../models/idssDecision.model');

const performanceController = {};

const parseTimeToSeconds = (timeValue) => {
  if (timeValue === null || timeValue === undefined) return null;

  if (typeof timeValue === 'number' && Number.isFinite(timeValue)) {
    return timeValue;
  }

  const raw = String(timeValue).trim().replace(',', '.');
  if (!raw) return null;

  if (!raw.includes(':')) {
    const asFloat = Number(raw);
    return Number.isFinite(asFloat) ? asFloat : null;
  }

  const parts = raw.split(':').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return null;

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
};

const formatSeconds = (totalSeconds) => {
  if (!Number.isFinite(totalSeconds)) return null;

  const safeSeconds = Math.max(0, Number(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = (safeSeconds % 60).toFixed(2).padStart(5, '0');
  return `${minutes}:${seconds}`;
};

const computeAverage = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const computeStdDev = (values) => {
  if (!Array.isArray(values) || values.length < 2) return 0;
  const avg = computeAverage(values);
  const variance = values.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / values.length;
  return Math.sqrt(variance);
};

const resolveRoleFilter = async (req) => {
  const filter = {};

  if (req.user.role === 'NAGEUR') {
    const nageur = await Nageur.findOne({ utilisateur: req.user.userId });
    if (nageur) {
      filter.nageur = nageur._id;
    }
  }

  if (req.query.nageurId) filter.nageur = req.query.nageurId;
  if (req.query.type) filter.type = req.query.type;

  return filter;
};

// GET /performances - Get all or filtered
performanceController.getAll = async (req, res) => {
  try {
    const filter = await resolveRoleFilter(req);
    const limit = Math.min(Math.max(Number(req.query.limit) || 300, 1), 1000);

    const performances = await Performance.find(filter)
      .populate({ path: 'nageur', populate: { path: 'utilisateur', select: 'nom prenom' } })
      .populate('competition', 'nom date lieu')
      .populate('entrainement', 'titre date')
      .populate('addedBy', 'nom prenom')
      .sort({ date: -1 })
      .limit(limit);

    res.json(performances);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// GET /performances/trends
performanceController.getTrends = async (req, res) => {
  try {
    const filter = await resolveRoleFilter(req);
    const limit = Math.min(Math.max(Number(req.query.limit) || 60, 5), 300);

    const performances = await Performance.find(filter)
      .select('date temps epreuve type sessionLoad fatigueLevel techniqueScore consistencyScore')
      .sort({ date: 1 })
      .limit(limit);

    const points = performances
      .map((item) => {
        const seconds = parseTimeToSeconds(item.temps);
        if (!Number.isFinite(seconds)) return null;
        return {
          id: item._id,
          date: item.date,
          time: item.temps,
          value: Number(seconds.toFixed(2)),
          epreuve: item.epreuve,
          type: item.type,
          sessionLoad: item.sessionLoad || 0,
          fatigueLevel: item.fatigueLevel || null,
          techniqueScore: item.techniqueScore || null,
          consistencyScore: item.consistencyScore || null
        };
      })
      .filter(Boolean);

    const values = points.map((point) => point.value);
    res.json({
      points,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      count: points.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du chargement des tendances.', error: error.message });
  }
};

// GET /performances/insights
performanceController.getInsights = async (req, res) => {
  try {
    const filter = await resolveRoleFilter(req);
    const limit = Math.min(Math.max(Number(req.query.limit) || 80, 10), 300);

    const records = await Performance.find(filter)
      .select('date temps fatigueLevel techniqueScore consistencyScore sessionLoad predictionReady')
      .sort({ date: 1 })
      .limit(limit);

    const timed = records
      .map((record) => ({
        ...record.toObject(),
        seconds: parseTimeToSeconds(record.temps)
      }))
      .filter((record) => Number.isFinite(record.seconds));

    if (!timed.length) {
      return res.json({
        ready: false,
        message: 'Pas assez de donnees pour une analyse intelligente.',
        recommendations: ['Ajoutez au moins 3 resultats d entrainement pour demarrer l analyse.']
      });
    }

    const values = timed.map((record) => record.seconds);
    const latestValue = values[values.length - 1];
    const latestFive = values.slice(-5);
    const previousFive = values.slice(-10, -5);

    const recentAvg = computeAverage(latestFive);
    const previousAvg = computeAverage(previousFive);
    const delta = Number.isFinite(previousAvg) ? previousAvg - recentAvg : 0;

    let trend = 'stable';
    if (delta > 0.4) trend = 'improving';
    if (delta < -0.4) trend = 'declining';

    const expectedGain = Math.max(-2, Math.min(2, delta * 0.6));
    const predictedNextSeconds = Math.max(1, latestValue - expectedGain);

    const fatigueAvg = computeAverage(
      records
        .map((record) => Number(record.fatigueLevel))
        .filter((value) => Number.isFinite(value))
    );

    const techniqueAvg = computeAverage(
      records
        .map((record) => Number(record.techniqueScore))
        .filter((value) => Number.isFinite(value))
    );

    const consistencyAvg = computeAverage(
      records
        .map((record) => Number(record.consistencyScore))
        .filter((value) => Number.isFinite(value))
    );

    const recommendations = [];
    if (Number.isFinite(fatigueAvg) && fatigueAvg >= 7) {
      recommendations.push('Charge elevee detectee: reduire le volume sur 1 a 2 seances.');
    }
    if (Number.isFinite(techniqueAvg) && techniqueAvg <= 6) {
      recommendations.push('Prioriser un bloc technique court avant les seances vitesse.');
    }
    if (Number.isFinite(consistencyAvg) && consistencyAvg <= 6) {
      recommendations.push('Augmenter la regularite des seances (objectif: 3 seances consecutives).');
    }
    if (!recommendations.length) {
      recommendations.push('Progression stable: conserver la periodisation actuelle et monitorer la fatigue.');
    }

    const confidence = Math.round(Math.min(95, 45 + (values.length * 3) + (computeStdDev(values) < 1 ? 12 : 0)));

    res.json({
      ready: true,
      trend,
      confidence,
      latestTime: formatSeconds(latestValue),
      predictedNextTime: formatSeconds(predictedNextSeconds),
      predictedNextSeconds: Number(predictedNextSeconds.toFixed(2)),
      recentAverage: Number(recentAvg.toFixed(2)),
      previousAverage: Number.isFinite(previousAvg) ? Number(previousAvg.toFixed(2)) : null,
      recommendations,
      dataPoints: values.length,
      aiReadyCount: records.filter((record) => record.predictionReady).length
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l analyse intelligente.', error: error.message });
  }
};

// POST /performances
performanceController.create = async (req, res) => {
  try {
    const {
      nageur,
      competition,
      entrainement,
      type,
      epreuve,
      temps,
      distance,
      style,
      classement,
      notes,
      date,
      sessionLoad,
      fatigueLevel,
      techniqueScore,
      consistencyScore,
      strokeEfficiency,
      enduranceScore,
      sprintScore,
      coachComment,
      analysisStatus,
      predictionReady
    } = req.body;

    const perf = new Performance({
      nageur,
      competition,
      entrainement,
      type,
      epreuve,
      temps,
      distance,
      style,
      classement,
      notes,
      sessionLoad,
      fatigueLevel,
      techniqueScore,
      consistencyScore,
      strokeEfficiency,
      enduranceScore,
      sprintScore,
      coachComment,
      analysisStatus,
      predictionReady,
      addedBy: req.user.userId,
      date: date || new Date()
    });

    await perf.save();

    // ── IDSS: run rule engine asynchronously after save ──────────────────
    setImmediate(async () => {
      try {
        const baseline = await updateBaseline(perf.nageur);
        const result   = evaluateRules(perf, baseline);
        await IDSSDecision.create({
          nageur: perf.nageur, performance: perf._id,
          fatigueScore: result.fatigueScore, fatigueLevel: result.fatigueLevel,
          triggeredRules: result.triggeredRules, recommendation: result.recommendation,
          recommendationMessage: result.recommendationMessage,
          confidence: result.confidence, source: result.source,
          inputSnapshot: result.inputSnapshot
        });
      } catch (e) { console.error('IDSS auto-analysis error:', e.message); }
    });

    res.status(201).json({ message: 'Performance ajoutée !', performance: perf });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// POST /performances/training-result
performanceController.createTrainingResult = async (req, res) => {
  try {
    const {
      nageur,
      entrainement,
      epreuve,
      trainingType,
      duration,
      intensity,
      attendance,
      feedback,
      temps,
      distance,
      style,
      notes,
      sessionLoad,
      fatigueLevel,
      techniqueScore,
      consistencyScore,
      strokeEfficiency,
      enduranceScore,
      sprintScore,
      coachComment,
      date
    } = req.body;

    if (!nageur || !epreuve || !temps) {
      return res.status(400).json({ message: 'nageur, epreuve et temps sont obligatoires.' });
    }

    const perf = new Performance({
      nageur,
      entrainement,
      type: 'Entrainement',
      epreuve,
      trainingType,
      duration,
      intensity,
      attendance,
      feedback,
      temps,
      distance,
      style,
      notes: notes || '',
      sessionLoad: sessionLoad || 0,
      fatigueLevel,
      techniqueScore,
      consistencyScore,
      strokeEfficiency,
      enduranceScore,
      sprintScore,
      coachComment: coachComment || '',
      analysisStatus: 'pending',
      predictionReady: true,
      addedBy: req.user.userId,
      date: date || new Date()
    });

    await perf.save();

    // ── IDSS: run rule engine asynchronously after save ──────────────────
    setImmediate(async () => {
      try {
        const baseline = await updateBaseline(perf.nageur);
        const result   = evaluateRules(perf, baseline);
        await IDSSDecision.create({
          nageur: perf.nageur, performance: perf._id,
          fatigueScore: result.fatigueScore, fatigueLevel: result.fatigueLevel,
          triggeredRules: result.triggeredRules, recommendation: result.recommendation,
          recommendationMessage: result.recommendationMessage,
          confidence: result.confidence, source: result.source,
          inputSnapshot: result.inputSnapshot
        });
      } catch (e) { console.error('IDSS auto-analysis error:', e.message); }
    });

    res.status(201).json({ message: 'Resultat d entrainement ajoute avec succes.', performance: perf });
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
