const mongoose = require('mongoose');

const IDSSDecisionSchema = new mongoose.Schema({
  nageur: { type: mongoose.Schema.Types.ObjectId, ref: 'Nageur', required: true },
  performance: { type: mongoose.Schema.Types.ObjectId, ref: 'Performance' }, // linked session

  // AI outputs
  fatigueScore: { type: Number, min: 0, max: 100, default: 0 }, // 0–100 (0=fresh, 100=critical)
  fatigueLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },

  // Triggered rules
  triggeredRules: [{
    ruleId: String,
    severity: { type: String, enum: ['INFO', 'WARN', 'CRITICAL'] },
    message: String,
    overridable: { type: Boolean, default: true }
  }],

  // Final recommendation
  recommendation: {
    type: String,
    enum: [
      'NORMAL_TRAINING',
      'REDUCE_INTENSITY',
      'RECOVERY_SESSION',
      'REST_DAY',
      'MANDATORY_REST',
      'MEDICAL_ATTENTION'
    ],
    default: 'NORMAL_TRAINING'
  },
  recommendationMessage: { type: String, default: '' },

  // Confidence & source
  confidence: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  source: { type: String, enum: ['rules', 'ml', 'hybrid'], default: 'rules' },

  // Snapshot of input data used (for explainability / debugging)
  inputSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Coach action
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acknowledgedAt: { type: Date },
  coachNote: { type: String, default: '' }

}, { timestamps: true });

IDSSDecisionSchema.index({ nageur: 1, createdAt: -1 });
IDSSDecisionSchema.index({ fatigueLevel: 1, acknowledged: 1 });

module.exports = mongoose.model('IDSSDecision', IDSSDecisionSchema);
