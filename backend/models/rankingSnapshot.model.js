const mongoose = require('mongoose');

const RankingEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nageur: { type: mongoose.Schema.Types.ObjectId, ref: 'Nageur', required: true },
  globalScore: { type: Number, required: true },
  rank: { type: Number, required: true },
  resultsCount: { type: Number, required: true, min: 0 },
  competitionsCount: { type: Number, required: true, min: 0 },
  bestRank: { type: Number, required: true },
  avgScore: { type: Number, required: true },
  avgMetrics: {
    technique: { type: Number, default: 0 },
    endurance: { type: Number, default: 0 },
    speed: { type: Number, default: 0 }
  },
  components: {
    score: { type: Number, required: true },
    rank: { type: Number, required: true },
    metrics: { type: Number, required: true }
  }
}, { _id: false });

const RankingSnapshotSchema = new mongoose.Schema({
  periodType: { type: String, enum: ['weekly', 'monthly', 'yearly'], required: true },
  periodKey: { type: String, required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  generatedAt: { type: Date, default: Date.now },
  mvpUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  topUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  entries: { type: [RankingEntrySchema], default: [] }
}, { timestamps: true });

RankingSnapshotSchema.index({ periodType: 1, periodKey: 1 }, { unique: true });
RankingSnapshotSchema.index({ periodType: 1, generatedAt: -1 });

module.exports = mongoose.model('RankingSnapshot', RankingSnapshotSchema);
