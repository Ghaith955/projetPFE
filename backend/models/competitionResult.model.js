const mongoose = require('mongoose');

const CompetitionResultSchema = new mongoose.Schema({
  competition: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', required: true },
  nageur: { type: mongoose.Schema.Types.ObjectId, ref: 'Nageur', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coach: { type: mongoose.Schema.Types.ObjectId, ref: 'Entraineur', required: true },
  score: { type: Number, required: true, min: 0 },
  rank: { type: Number, required: true, min: 1 },
  time: { type: String, default: '' },
  timeSeconds: { type: Number, min: 0 },
  distance: { type: Number, min: 0 },
  stroke: { type: String, default: '' },
  category: { type: String, default: '' },
  performanceMetrics: {
    techniqueScore: { type: Number, min: 0, max: 100 },
    enduranceScore: { type: Number, min: 0, max: 100 },
    sprintScore: { type: Number, min: 0, max: 100 },
    strokeEfficiency: { type: Number, min: 0, max: 100 },
    consistencyScore: { type: Number, min: 0, max: 100 }
  },
  notes: { type: String, default: '' },
  resultDate: { type: Date, default: Date.now }
}, { timestamps: true });

CompetitionResultSchema.index({ competition: 1, nageur: 1 });
CompetitionResultSchema.index({ user: 1, resultDate: -1 });
CompetitionResultSchema.index({ resultDate: -1 });

module.exports = mongoose.model('CompetitionResult', CompetitionResultSchema);
