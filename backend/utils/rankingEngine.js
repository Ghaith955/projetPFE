const CompetitionResult = require('../models/competitionResult.model');
const Performance = require('../models/performance.model');
const Nageur = require('../models/nageur.model');
const RankingSnapshot = require('../models/rankingSnapshot.model');

const getPeriodWindow = (periodType, date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date for ranking');

  if (periodType === 'weekly') {
    const day = d.getDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(d);
    start.setDate(d.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const year = start.getFullYear();
    const week = Math.ceil((((start - new Date(year, 0, 1)) / 86400000) + 1) / 7);
    return { start, end, key: `${year}-W${String(week).padStart(2, '0')}` };
  }

  if (periodType === 'monthly') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { start, end, key };
  }

  const start = new Date(d.getFullYear(), 0, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d.getFullYear(), 11, 31);
  end.setHours(23, 59, 59, 999);
  return { start, end, key: `${d.getFullYear()}` };
};

const safeAvg = (total, count) => (count > 0 ? total / count : 0);

const normalize = (values, invert = false) => {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return values.map(() => 0.5);
  return values.map((v) => {
    if (invert) return (max - v) / (max - min);
    return (v - min) / (max - min);
  });
};

/**
 * Build ranking entries from training performances when no competition results exist.
 * Computes a composite score from: distance, intensity, attendance, session volume.
 */
const buildEntriesFromTraining = async (start, end) => {
  const performances = await Performance.find({
    date: { $gte: start, $lte: end }
  }).lean();

  if (!performances.length) return [];

  // Group by nageur
  const byNageur = new Map();
  for (const p of performances) {
    const nageurId = String(p.nageur);
    if (!byNageur.has(nageurId)) {
      byNageur.set(nageurId, {
        nageurId,
        totalDistance: 0,
        totalIntensity: 0,
        totalSessionLoad: 0,
        presentCount: 0,
        count: 0
      });
    }
    const item = byNageur.get(nageurId);
    item.totalDistance += Number(p.distance || 0);
    item.totalIntensity += Number(p.intensity || p.fatigueLevel || 0);
    item.totalSessionLoad += Number(p.sessionLoad || 0);
    if (p.attendance === 'present') item.presentCount += 1;
    item.count += 1;
  }

  // Resolve nageur -> user mapping
  const nageurIds = Array.from(byNageur.keys());
  const nageurDocs = await Nageur.find({ _id: { $in: nageurIds } }).select('utilisateur').lean();
  const nageurToUser = new Map();
  for (const n of nageurDocs) {
    nageurToUser.set(String(n._id), n.utilisateur);
  }

  // Compute composite score per swimmer
  const rawEntries = [];
  for (const [nageurId, item] of byNageur.entries()) {
    const userId = nageurToUser.get(nageurId);
    if (!userId) continue; // skip orphaned

    const avgDistance = safeAvg(item.totalDistance, item.count);
    const avgIntensity = safeAvg(item.totalIntensity, item.count);
    const attendanceRate = safeAvg(item.presentCount, item.count);
    const sessionVolume = item.count;

    // Composite: 35% distance + 25% intensity + 25% attendance + 15% volume
    const distanceScore = Math.min(avgDistance / 3000, 1) * 100; // normalize around 3000m
    const intensityScore = Math.min(avgIntensity / 10, 1) * 100;
    const attendanceScore = attendanceRate * 100;
    const volumeScore = Math.min(sessionVolume / 10, 1) * 100; // normalize around 10 sessions

    const globalScore = Number(
      (distanceScore * 0.35 + intensityScore * 0.25 + attendanceScore * 0.25 + volumeScore * 0.15).toFixed(2)
    );

    rawEntries.push({
      user: userId,
      nageur: nageurId,
      globalScore,
      rank: 0,
      resultsCount: item.count,
      competitionsCount: 0,
      bestRank: 0,
      avgScore: globalScore,
      avgMetrics: {
        technique: Number(intensityScore.toFixed(2)),
        endurance: Number(distanceScore.toFixed(2)),
        speed: 0
      },
      components: {
        score: Number((globalScore / 100).toFixed(4)),
        rank: 0,
        metrics: Number(((distanceScore + intensityScore) / 200).toFixed(4))
      }
    });
  }

  // Sort by global score desc, assign ranks
  rawEntries.sort((a, b) => b.globalScore - a.globalScore);
  rawEntries.forEach((entry, idx) => { entry.rank = idx + 1; });

  return rawEntries;
};

const computeRankings = async (periodType, date) => {
  const { start, end, key } = getPeriodWindow(periodType, date);

  const results = await CompetitionResult.find({
    resultDate: { $gte: start, $lte: end }
  }).lean();

  if (!results.length) {
    // Fallback: compute ranking from training performances
    const trainingEntries = await buildEntriesFromTraining(start, end);

    if (!trainingEntries.length) {
      await RankingSnapshot.findOneAndUpdate(
        { periodType, periodKey: key },
        {
          periodType,
          periodKey: key,
          periodStart: start,
          periodEnd: end,
          generatedAt: new Date(),
          mvpUser: null,
          topUsers: [],
          entries: []
        },
        { upsert: true, new: true }
      );
      return { periodType, periodKey: key, entries: [] };
    }

    const topUsers = trainingEntries.slice(0, 3).map((e) => e.user);
    const mvpUser = trainingEntries[0]?.user || null;

    await RankingSnapshot.findOneAndUpdate(
      { periodType, periodKey: key },
      {
        periodType,
        periodKey: key,
        periodStart: start,
        periodEnd: end,
        generatedAt: new Date(),
        mvpUser,
        topUsers,
        entries: trainingEntries
      },
      { upsert: true, new: true }
    );
    return { periodType, periodKey: key, entries: trainingEntries, mvpUser, topUsers };
  }

  const byUser = new Map();
  for (const r of results) {
    const userId = String(r.user);
    if (!byUser.has(userId)) {
      byUser.set(userId, {
        user: r.user,
        nageur: r.nageur,
        totalScore: 0,
        totalRank: 0,
        totalTechnique: 0,
        totalEndurance: 0,
        totalSprint: 0,
        totalEfficiency: 0,
        totalConsistency: 0,
        totalSpeed: 0,
        count: 0,
        competitions: new Set(),
        bestRank: Number.MAX_SAFE_INTEGER
      });
    }

    const item = byUser.get(userId);
    item.totalScore += Number(r.score || 0);
    item.totalRank += Number(r.rank || 0);
    item.totalTechnique += Number(r.performanceMetrics?.techniqueScore || 0);
    item.totalEndurance += Number(r.performanceMetrics?.enduranceScore || 0);
    item.totalSprint += Number(r.performanceMetrics?.sprintScore || 0);
    item.totalEfficiency += Number(r.performanceMetrics?.strokeEfficiency || 0);
    item.totalConsistency += Number(r.performanceMetrics?.consistencyScore || 0);

    if (r.distance && r.timeSeconds) {
      item.totalSpeed += r.distance / r.timeSeconds;
    }

    item.count += 1;
    item.competitions.add(String(r.competition));
    if (r.rank && r.rank < item.bestRank) item.bestRank = r.rank;
  }

  const entries = Array.from(byUser.values()).map((item) => {
    const avgScore = safeAvg(item.totalScore, item.count);
    const avgRank = safeAvg(item.totalRank, item.count);
    const avgTechnique = safeAvg(item.totalTechnique, item.count);
    const avgEndurance = safeAvg(item.totalEndurance, item.count);
    const avgSprint = safeAvg(item.totalSprint, item.count);
    const avgEfficiency = safeAvg(item.totalEfficiency, item.count);
    const avgConsistency = safeAvg(item.totalConsistency, item.count);
    const avgSpeed = safeAvg(item.totalSpeed, item.count);

    const metricsAvg = safeAvg(
      avgTechnique + avgEndurance + avgSprint + avgEfficiency + avgConsistency + avgSpeed * 100,
      6
    );

    return {
      user: item.user,
      nageur: item.nageur,
      avgScore,
      avgRank,
      avgMetrics: {
        technique: avgTechnique,
        endurance: avgEndurance,
        speed: avgSpeed
      },
      metricsAvg,
      resultsCount: item.count,
      competitionsCount: item.competitions.size,
      bestRank: item.bestRank === Number.MAX_SAFE_INTEGER ? 0 : item.bestRank
    };
  });

  const scores = entries.map((e) => e.avgScore);
  const ranks = entries.map((e) => e.avgRank);
  const metrics = entries.map((e) => e.metricsAvg);

  const nScore = normalize(scores);
  const nRank = normalize(ranks, true);
  const nMetrics = normalize(metrics);

  const rankedEntries = entries.map((entry, idx) => {
    return {
      user: entry.user,
      nageur: entry.nageur,
      globalScore: Number(entry.avgScore.toFixed(2)),
      rank: 0,
      resultsCount: entry.resultsCount,
      competitionsCount: entry.competitionsCount,
      bestRank: entry.bestRank || 0,
      avgScore: Number(entry.avgScore.toFixed(2)),
      avgMetrics: {
        technique: Number(entry.avgMetrics.technique.toFixed(2)),
        endurance: Number(entry.avgMetrics.endurance.toFixed(2)),
        speed: Number(entry.avgMetrics.speed.toFixed(4))
      },
      components: {
        score: Number(nScore[idx].toFixed(4)),
        rank: Number(nRank[idx].toFixed(4)),
        metrics: Number(nMetrics[idx].toFixed(4))
      }
    };
  });

  rankedEntries.sort((a, b) => b.globalScore - a.globalScore);
  rankedEntries.forEach((entry, idx) => { entry.rank = idx + 1; });

  const topUsers = rankedEntries.slice(0, 3).map((e) => e.user);
  const mvpUser = rankedEntries.length ? rankedEntries[0].user : null;

  await RankingSnapshot.findOneAndUpdate(
    { periodType, periodKey: key },
    {
      periodType,
      periodKey: key,
      periodStart: start,
      periodEnd: end,
      generatedAt: new Date(),
      mvpUser,
      topUsers,
      entries: rankedEntries
    },
    { upsert: true, new: true }
  );

  return { periodType, periodKey: key, entries: rankedEntries, mvpUser, topUsers };
};

const updateRankingsForDate = async (date) => {
  await computeRankings('weekly', date);
  await computeRankings('monthly', date);
  await computeRankings('yearly', date);
};

module.exports = {
  computeRankings,
  updateRankingsForDate,
  getPeriodWindow
};
