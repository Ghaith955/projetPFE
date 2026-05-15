const IDSSDecision    = require('../models/idssDecision.model');
const SwimmerBaseline = require('../models/swimmerBaseline.model');
const Nageur          = require('../models/nageur.model');
const Performance     = require('../models/performance.model');
const { evaluateRules }  = require('../utils/idssRuleEngine');
const { updateBaseline } = require('../utils/idssBaselineUpdater');
const { ensureCoachSwimmerAccess, getCoachSwimmerIds } = require('../utils/coachScope');

const idssController = {};

// ─────────────────────────────────────────────────────────────────
// POST /idss/analyze/:performanceId
// Triggered after a performance record is saved.
// Runs the rule engine and stores the decision.
// ─────────────────────────────────────────────────────────────────
idssController.analyzePerformance = async (req, res) => {
  try {
    const performance = await Performance.findById(req.params.performanceId);
    if (!performance) return res.status(404).json({ message: 'Performance non trouvée.' });

    const nageurId = performance.nageur;

    // 1. Update rolling stats (short-term memory)
    const baseline = await updateBaseline(nageurId);

    // 2. Run rule engine
    const result = evaluateRules(performance, baseline);

    // 3. Persist decision
    const decision = await IDSSDecision.create({
      nageur:              nageurId,
      performance:         performance._id,
      fatigueScore:        result.fatigueScore,
      fatigueLevel:        result.fatigueLevel,
      triggeredRules:      result.triggeredRules,
      recommendation:      result.recommendation,
      recommendationMessage: result.recommendationMessage,
      confidence:          result.confidence,
      source:              result.source,
      inputSnapshot:       result.inputSnapshot
    });

    return res.status(201).json({ decision, baseline });
  } catch (err) {
    console.error('IDSS analyze error:', err);
    res.status(500).json({ message: 'Erreur moteur IDSS.', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /idss/decisions
// Returns all decisions, optionally filtered by nageurId or level
// ─────────────────────────────────────────────────────────────────
idssController.getDecisions = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role === 'ENTRAINEUR') {
      const swimmerIds = await getCoachSwimmerIds(req.user.userId);
      if (!swimmerIds.length) return res.json([]);
      if (req.query.nageurId) {
        const allowed = swimmerIds.some((id) => String(id) === String(req.query.nageurId));
        if (!allowed) return res.status(403).json({ message: 'Acces interdit.' });
        filter.nageur = req.query.nageurId;
      } else {
        filter.nageur = { $in: swimmerIds };
      }
    }
    if (req.query.nageurId && req.user?.role !== 'ENTRAINEUR') filter.nageur = req.query.nageurId;
    if (req.query.level)    filter.fatigueLevel = req.query.level;
    if (req.query.acknowledged !== undefined)
      filter.acknowledged = req.query.acknowledged === 'true';

    const decisions = await IDSSDecision.find(filter)
      .populate({ path: 'nageur', populate: { path: 'utilisateur', select: 'nom prenom imageprofile' } })
      .populate('performance', 'date intensity distance fatigueLevel feedback')
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50);

    res.json(decisions);
  } catch (err) {
    console.error('IDSS getDecisions error:', err);
    res.status(500).json({ message: 'Erreur IDSS.', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /idss/decisions/latest/:nageurId
// Latest decision for a specific swimmer
// ─────────────────────────────────────────────────────────────────
idssController.getLatestDecision = async (req, res) => {
  try {
    if (req.user?.role === 'ENTRAINEUR') {
      const allowed = await ensureCoachSwimmerAccess(req.user.userId, req.params.nageurId);
      if (!allowed) return res.status(403).json({ message: 'Acces interdit.' });
    }
    const decision = await IDSSDecision.findOne({ nageur: req.params.nageurId })
      .sort({ createdAt: -1 })
      .populate('performance', 'date intensity distance fatigueLevel feedback');

    res.json(decision || null);
  } catch (err) {
    res.status(500).json({ message: 'Erreur IDSS.', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /idss/summary
// Summary for the dashboard: at-risk swimmers, alert counts, averages
// ─────────────────────────────────────────────────────────────────
idssController.getSummary = async (req, res) => {
  try {
    let swimmerIds = null;
    if (req.user?.role === 'ENTRAINEUR') {
      swimmerIds = await getCoachSwimmerIds(req.user.userId);
      if (!swimmerIds.length) {
        return res.json({ totalAnalyzed: 0, levelCounts: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }, atRiskSwimmers: [], pendingAlerts: 0 });
      }
    }
    // Get the latest decision per swimmer
    const pipeline = [{ $sort: { createdAt: -1 } }];
    if (swimmerIds) pipeline.push({ $match: { nageur: { $in: swimmerIds } } });
    pipeline.push(
      { $group: { _id: '$nageur', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } }
    );
    const latest = await IDSSDecision.aggregate(pipeline);

    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const atRisk = [];

    for (const d of latest) {
      counts[d.fatigueLevel] = (counts[d.fatigueLevel] || 0) + 1;
      if (d.fatigueLevel === 'HIGH' || d.fatigueLevel === 'CRITICAL') {
        atRisk.push({
          nageurId:    d.nageur,
          fatigueLevel: d.fatigueLevel,
          fatigueScore: d.fatigueScore,
          recommendation: d.recommendation,
          triggeredRules: d.triggeredRules,
          decisionId:  d._id,
          createdAt:   d.createdAt
        });
      }
    }

    // Populate swimmer info
    const populated = await Promise.all(
      atRisk.map(async (r) => {
        const n = await Nageur.findById(r.nageurId)
          .populate('utilisateur', 'nom prenom imageprofile');
        return { ...r, nageur: n };
      })
    );

    res.json({
      totalAnalyzed: latest.length,
      levelCounts: counts,
      atRiskSwimmers: populated.filter(r => r.nageur),
      pendingAlerts: latest.filter(d => !d.acknowledged).length
    });
  } catch (err) {
    console.error('IDSS summary error:', err);
    res.status(500).json({ message: 'Erreur IDSS.', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /idss/my-status  (Swimmer role)
// The logged-in swimmer's own latest decision + baseline
// ─────────────────────────────────────────────────────────────────
idssController.getMyStatus = async (req, res) => {
  try {
    const nageur = await Nageur.findOne({ utilisateur: req.user.userId });
    if (!nageur) return res.status(404).json({ message: 'Profil nageur introuvable.' });

    const [decision, baseline] = await Promise.all([
      IDSSDecision.findOne({ nageur: nageur._id })
        .sort({ createdAt: -1 })
        .populate('performance', 'date intensity distance fatigueLevel feedback'),
      SwimmerBaseline.findOne({ nageur: nageur._id })
    ]);

    res.json({ decision: decision || null, baseline: baseline || null });
  } catch (err) {
    console.error('IDSS my-status error:', err);
    res.status(500).json({ message: 'Erreur IDSS.', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /idss/baseline/:nageurId
// Returns the baseline for a given swimmer
// ─────────────────────────────────────────────────────────────────
idssController.getBaseline = async (req, res) => {
  try {
    if (req.user?.role === 'ENTRAINEUR') {
      const allowed = await ensureCoachSwimmerAccess(req.user.userId, req.params.nageurId);
      if (!allowed) return res.status(403).json({ message: 'Acces interdit.' });
    }
    const baseline = await SwimmerBaseline.findOne({ nageur: req.params.nageurId });
    res.json(baseline || null);
  } catch (err) {
    res.status(500).json({ message: 'Erreur IDSS.', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// PATCH /idss/baseline/:nageurId
// Admin/Coach updates personal bests and load targets
// ─────────────────────────────────────────────────────────────────
idssController.updateBaseline = async (req, res) => {
  try {
    if (req.user?.role === 'ENTRAINEUR') {
      const hasAccess = await ensureCoachSwimmerAccess(req.user.userId, req.params.nageurId);
      if (!hasAccess) return res.status(403).json({ message: 'Acces interdit.' });
    }
    const allowed = ['personalBests', 'weeklyLoadTargetKm', 'maxConsecutiveTrainingDays'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const baseline = await SwimmerBaseline.findOneAndUpdate(
      { nageur: req.params.nageurId },
      { $set: update },
      { new: true, upsert: true, returnDocument: 'after' }
    );
    res.json(baseline);
  } catch (err) {
    res.status(500).json({ message: 'Erreur mise à jour baseline.', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// PATCH /idss/decisions/:id/acknowledge
// Coach acknowledges / dismisses an alert
// ─────────────────────────────────────────────────────────────────
idssController.acknowledgeDecision = async (req, res) => {
  try {
    if (req.user?.role === 'ENTRAINEUR') {
      const decision = await IDSSDecision.findById(req.params.id).select('nageur');
      if (!decision) return res.status(404).json({ message: 'Décision non trouvée.' });
      const allowed = await ensureCoachSwimmerAccess(req.user.userId, decision.nageur);
      if (!allowed) return res.status(403).json({ message: 'Acces interdit.' });
    }
    const decision = await IDSSDecision.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          acknowledged:   true,
          acknowledgedBy: req.user.userId,
          acknowledgedAt: new Date(),
          coachNote:      req.body.note || ''
        }
      },
      { new: true }
    );
    if (!decision) return res.status(404).json({ message: 'Décision non trouvée.' });
    res.json(decision);
  } catch (err) {
    res.status(500).json({ message: 'Erreur acquittement.', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /idss/history/:nageurId
// Full decision history for one swimmer (for trend charts)
// ─────────────────────────────────────────────────────────────────
idssController.getHistory = async (req, res) => {
  try {
    if (req.user?.role === 'ENTRAINEUR') {
      const allowed = await ensureCoachSwimmerAccess(req.user.userId, req.params.nageurId);
      if (!allowed) return res.status(403).json({ message: 'Acces interdit.' });
    }
    const limit = parseInt(req.query.limit) || 30;
    const decisions = await IDSSDecision.find({ nageur: req.params.nageurId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('performance', 'date intensity distance fatigueLevel');
    res.json(decisions);
  } catch (err) {
    res.status(500).json({ message: 'Erreur historique IDSS.', error: err.message });
  }
};

module.exports = idssController;
