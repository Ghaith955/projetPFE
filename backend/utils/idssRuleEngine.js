/**
 * IDSS Rule Engine — Phase 1
 * Pure rule-based fatigue detection for swimmers.
 * Each rule returns { triggered: bool, ruleId, severity, message, overridable }
 * The engine aggregates all triggered rules → fatigue score → recommendation.
 */

// ── Intensity weight map ───────────────────────────────────────────────────
const INTENSITY_WEIGHT = {
  'Faible':   1,
  'Modérée':  2,
  'Élevée':   3,
  'Maximale': 4
};

// ── All fatigue detection rules ────────────────────────────────────────────
const RULES = [
  {
    id: 'HIGH_CONSECUTIVE_DAYS',
    severity: 'WARN',
    overridable: true,
    evaluate: (ctx) => ({
      triggered: ctx.consecutiveTrainingDays >= 5,
      message: `${ctx.consecutiveTrainingDays} jours consécutifs d'entraînement — repos recommandé`
    })
  },
  {
    id: 'CRITICAL_CONSECUTIVE_DAYS',
    severity: 'CRITICAL',
    overridable: false,
    evaluate: (ctx) => ({
      triggered: ctx.consecutiveTrainingDays >= 7,
      message: `${ctx.consecutiveTrainingDays} jours sans repos — risque élevé de blessure`
    })
  },
  {
    id: 'WEEKLY_OVERLOAD',
    severity: 'WARN',
    overridable: true,
    evaluate: (ctx) => ({
      triggered: ctx.weeklyLoadKm > 0 && ctx.weeklyLoadTargetKm > 0 &&
                 ctx.rolling7DayLoad > ctx.weeklyLoadTargetKm * 1.3,
      message: `Charge hebdomadaire ${ctx.rolling7DayLoad.toFixed(1)}km — dépasse l'objectif de 30%`
    })
  },
  {
    id: 'CRITICAL_WEEKLY_OVERLOAD',
    severity: 'CRITICAL',
    overridable: false,
    evaluate: (ctx) => ({
      triggered: ctx.weeklyLoadKm > 0 && ctx.weeklyLoadTargetKm > 0 &&
                 ctx.rolling7DayLoad > ctx.weeklyLoadTargetKm * 1.5,
      message: `Charge hebdomadaire critique (${ctx.rolling7DayLoad.toFixed(1)}km) — arrêt obligatoire`
    })
  },
  {
    id: 'LAP_TIME_REGRESSION',
    severity: 'WARN',
    overridable: true,
    evaluate: (ctx) => {
      if (!ctx.sessionAvg100mSec || !ctx.personalBest100m) return { triggered: false, message: '' };
      const ratio = ctx.sessionAvg100mSec / ctx.personalBest100m;
      return {
        triggered: ratio > 1.15,
        message: `Temps moyen ${(ratio * 100 - 100).toFixed(0)}% au-dessus du record personnel — possible fatigue`
      };
    }
  },
  {
    id: 'HIGH_RPE_SESSION',
    severity: 'WARN',
    overridable: true,
    evaluate: (ctx) => ({
      triggered: ctx.rpe !== null && ctx.rpe >= 8,
      message: `RPE élevé (${ctx.rpe}/10) — effort perçu très difficile`
    })
  },
  {
    id: 'HIGH_RPE_STREAK',
    severity: 'WARN',
    overridable: true,
    evaluate: (ctx) => ({
      triggered: ctx.avgRpeLast3Sessions !== null && ctx.avgRpeLast3Sessions >= 8,
      message: `RPE moyen ${ctx.avgRpeLast3Sessions.toFixed(1)}/10 sur les 3 dernières séances`
    })
  },
  {
    id: 'HIGH_INTENSITY_POOR_FEEDBACK',
    severity: 'WARN',
    overridable: true,
    evaluate: (ctx) => ({
      triggered: ctx.intensityWeight >= 3 && ctx.feedback === 'poor',
      message: 'Séance de haute intensité avec retour coach "faible" — vérifier l\'état du nageur'
    })
  },
  {
    id: 'FATIGUE_LEVEL_HIGH',
    severity: 'WARN',
    overridable: true,
    evaluate: (ctx) => ({
      triggered: ctx.fatigueInput !== null && ctx.fatigueInput >= 7,
      message: `Niveau de fatigue déclaré: ${ctx.fatigueInput}/10`
    })
  },
  {
    id: 'FATIGUE_LEVEL_CRITICAL',
    severity: 'CRITICAL',
    overridable: false,
    evaluate: (ctx) => ({
      triggered: ctx.fatigueInput !== null && ctx.fatigueInput >= 9,
      message: `Fatigue critique déclarée: ${ctx.fatigueInput}/10 — arrêt immédiat recommandé`
    })
  },
  {
    id: 'HIGH_SESSION_LOAD',
    severity: 'INFO',
    overridable: true,
    evaluate: (ctx) => ({
      triggered: ctx.sessionLoad > 0 && ctx.sessionLoad >= 800,
      message: `Charge de séance élevée: ${ctx.sessionLoad} (distance × intensité)`
    })
  }
];

// ── Score mapping ──────────────────────────────────────────────────────────
const SEVERITY_SCORE = { INFO: 5, WARN: 20, CRITICAL: 50 };

const SCORE_TO_LEVEL = (score) => {
  if (score >= 70) return 'CRITICAL';
  if (score >= 40) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
};

const LEVEL_TO_RECOMMENDATION = (level, hasCritical) => {
  if (hasCritical) return { rec: 'MANDATORY_REST', msg: 'Repos obligatoire — facteurs de risque critiques détectés.' };
  if (level === 'HIGH')   return { rec: 'REST_DAY',        msg: 'Journée de repos recommandée pour récupération optimale.' };
  if (level === 'MEDIUM') return { rec: 'REDUCE_INTENSITY', msg: 'Réduire l\'intensité lors de la prochaine séance.' };
  return { rec: 'NORMAL_TRAINING', msg: 'État normal — continuer l\'entraînement planifié.' };
};

// ── Main engine function ───────────────────────────────────────────────────

/**
 * Evaluate all rules for a swimmer given session + baseline context.
 *
 * @param {Object} performance   - Performance document (Mongoose or plain)
 * @param {Object} baseline      - SwimmerBaseline document (rolling stats, targets)
 * @returns {Object}             - { fatigueScore, fatigueLevel, triggeredRules, recommendation, recommendationMessage, confidence, inputSnapshot }
 */
function evaluateRules(performance, baseline) {
  const intensityWeight = INTENSITY_WEIGHT[performance?.intensity] ||
                          INTENSITY_WEIGHT[performance?.trainingType] || 1;

  // Build context object used by every rule
  const ctx = {
    // Session-level data
    sessionDistanceM:       (performance?.distance || 0) * 1000, // km → m
    sessionDistanceKm:      performance?.distance || 0,
    intensityWeight,
    rpe:                    performance?.fatigueLevel ?? null,  // 1–10 from performance model
    feedback:               performance?.feedback ?? null,       // 'good'|'average'|'poor'
    fatigueInput:           performance?.fatigueLevel ?? null,
    sessionLoad:            performance?.sessionLoad || 0,
    sessionAvg100mSec:      null, // not tracked yet — future extension

    // Baseline / rolling stats
    consecutiveTrainingDays: baseline?.consecutiveTrainingDays || 0,
    rolling7DayLoad:         baseline?.rolling7DayLoad || 0,
    rolling14DayLoad:        baseline?.rolling14DayLoad || 0,
    weeklyLoadKm:            baseline?.rolling7DayLoad || 0,
    weeklyLoadTargetKm:      baseline?.weeklyLoadTargetKm || 20,
    avgRpeLast3Sessions:     baseline?.avgRpeLast3Sessions ?? null,
    personalBest100m:        baseline?.personalBests?.freestyle_100m ?? null
  };

  // Evaluate every rule
  const triggered = [];
  let totalScore = 0;
  let hasCritical = false;

  for (const rule of RULES) {
    const { triggered: fire, message } = rule.evaluate(ctx);
    if (fire) {
      triggered.push({
        ruleId: rule.id,
        severity: rule.severity,
        message,
        overridable: rule.overridable
      });
      totalScore += SEVERITY_SCORE[rule.severity] || 0;
      if (rule.severity === 'CRITICAL') hasCritical = true;
    }
  }

  // Cap at 100
  const fatigueScore = Math.min(totalScore, 100);
  const fatigueLevel = SCORE_TO_LEVEL(fatigueScore);
  const { rec, msg } = LEVEL_TO_RECOMMENDATION(fatigueLevel, hasCritical);

  // Confidence: more rules triggered = higher confidence in the decision
  const confidence = triggered.length === 0 ? 'LOW'
                   : triggered.length >= 3   ? 'HIGH'
                   : 'MEDIUM';

  return {
    fatigueScore,
    fatigueLevel,
    triggeredRules: triggered,
    recommendation: rec,
    recommendationMessage: msg,
    confidence,
    source: 'rules',
    inputSnapshot: ctx
  };
}

module.exports = { evaluateRules };
