const RankingSnapshot = require('../models/rankingSnapshot.model');
const { computeRankings } = require('../utils/rankingEngine');

const rankingController = {};

// Helper: deeply populate a ranking snapshot (entries.nageur -> utilisateur)
const deepPopulateSnapshot = async (query) => {
  const snapshot = await query
    .populate('topUsers', 'nom prenom email')
    .populate('mvpUser', 'nom prenom email')
    .populate('entries.user', 'nom prenom email')
    .populate({
      path: 'entries.nageur',
      populate: { path: 'utilisateur', select: 'nom prenom email' }
    })
    .lean();
  return snapshot;
};

// GET /rankings/latest?type=weekly|monthly|yearly
rankingController.getLatestRanking = async (req, res) => {
  try {
    const periodType = req.query.type || 'weekly';
    let snapshot = await deepPopulateSnapshot(
      RankingSnapshot.findOne({ periodType }).sort({ generatedAt: -1 })
    );

    if (!snapshot || !Array.isArray(snapshot.entries) || snapshot.entries.length === 0) {
      await computeRankings(periodType, new Date());
      snapshot = await deepPopulateSnapshot(
        RankingSnapshot.findOne({ periodType }).sort({ generatedAt: -1 })
      );
    }

    if (snapshot && (!Array.isArray(snapshot.entries) || snapshot.entries.length === 0)) {
      snapshot = await deepPopulateSnapshot(
        RankingSnapshot.findOne({ periodType, 'entries.0': { $exists: true } })
          .sort({ periodEnd: -1, generatedAt: -1 })
      );
    }
    res.json(snapshot || null);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération ranking.', error: error.message });
  }
};

// GET /rankings/by-period?type=weekly&key=2026-W18
rankingController.getRankingByPeriod = async (req, res) => {
  try {
    const periodType = req.query.type || 'weekly';
    const periodKey = req.query.key;
    if (!periodKey) return res.status(400).json({ message: 'Clé de période manquante.' });

    const snapshot = await deepPopulateSnapshot(
      RankingSnapshot.findOne({ periodType, periodKey })
    );
    res.json(snapshot || null);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération ranking.', error: error.message });
  }
};

// GET /rankings/history/:userId?type=weekly&limit=12
rankingController.getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const periodType = req.query.type || 'weekly';
    const limit = Number(req.query.limit || 12);

    const snapshots = await RankingSnapshot.find({ periodType, 'entries.user': userId })
      .sort({ periodEnd: -1 })
      .limit(limit)
      .lean();

    const history = snapshots.map((snap) => {
      const entry = snap.entries.find((e) => String(e.user) === String(userId));
      return {
        periodKey: snap.periodKey,
        periodStart: snap.periodStart,
        periodEnd: snap.periodEnd,
        globalScore: entry?.globalScore || 0,
        rank: entry?.rank || 0
      };
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération historique.', error: error.message });
  }
};

// POST /rankings/recompute?type=weekly
rankingController.recomputeRanking = async (req, res) => {
  try {
    const periodType = req.query.type || 'weekly';
    const result = await computeRankings(periodType, new Date());
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Erreur recompute ranking.', error: error.message });
  }
};

module.exports = rankingController;
