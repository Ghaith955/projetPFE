/**
 * IDSS Baseline Updater
 * Updates a swimmer's rolling stats after each session.
 * Keeps short-term memory (consecutive days, 7-day load, rolling RPE) current.
 */

const SwimmerBaseline = require('../models/swimmerBaseline.model');
const Performance     = require('../models/performance.model');

/**
 * Recomputes and persists rolling stats for a nageur after a new performance.
 * @param {ObjectId|string} nageurId
 * @returns {Object} updated baseline document
 */
async function updateBaseline(nageurId) {
  const now   = new Date();
  const day7  = new Date(now); day7.setDate(now.getDate() - 7);
  const day14 = new Date(now); day14.setDate(now.getDate() - 14);

  // Fetch last 30 days of sessions sorted newest-first
  const recent = await Performance.find({
    nageur: nageurId,
    date: { $gte: day14 }
  }).sort({ date: -1 });

  // ── Rolling 7-day and 14-day load ────────────────────────────────────────
  const rolling7DayLoad = recent
    .filter(p => new Date(p.date) >= day7)
    .reduce((sum, p) => sum + (p.distance || 0), 0);

  const rolling14DayLoad = recent
    .reduce((sum, p) => sum + (p.distance || 0), 0);

  // ── Consecutive training days ─────────────────────────────────────────────
  // Walk backwards from today; count how many consecutive days have ≥1 session
  const sessionDates = [...new Set(
    recent.map(p => new Date(p.date).toDateString())
  )];

  let consecutiveTrainingDays = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const dateStr = cursor.toDateString();
    if (sessionDates.includes(dateStr)) {
      consecutiveTrainingDays++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break; // gap found — streak ends
    }
  }

  // ── Average RPE of last 3 sessions ──────────────────────────────────────
  const withRpe = recent.filter(p => p.fatigueLevel != null).slice(0, 3);
  const avgRpeLast3Sessions = withRpe.length
    ? withRpe.reduce((s, p) => s + p.fatigueLevel, 0) / withRpe.length
    : null;

  // ── Last session date ────────────────────────────────────────────────────
  const lastSessionDate = recent.length ? recent[0].date : null;

  // ── Upsert into DB ────────────────────────────────────────────────────────
  const baseline = await SwimmerBaseline.findOneAndUpdate(
    { nageur: nageurId },
    {
      $set: {
        rolling7DayLoad,
        rolling14DayLoad,
        consecutiveTrainingDays,
        avgRpeLast3Sessions,
        lastSessionDate
      }
    },
    { new: true, upsert: true, returnDocument: 'after' }
  );

  return baseline;
}

module.exports = { updateBaseline };
