const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema({
  nageur: { type: mongoose.Schema.Types.ObjectId, ref: 'Nageur', required: true },
  competition: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition' },
  entrainement: { type: mongoose.Schema.Types.ObjectId, ref: 'Entrainement' },
  type: {
    type: String,
    enum: ['Competition', 'Entrainement', 'Test'],
    required: true
  },
  epreuve: { type: String, required: true },
  trainingType: { type: String, enum: ['endurance', 'sprint', 'technique'] },
  duration: { type: Number, min: 0 },
  intensity: { type: Number, min: 0, max: 10 },
  attendance: { type: String, enum: ['present', 'absent'], default: 'present' },
  feedback: { type: String, enum: ['good', 'average', 'poor'] },
  temps: { type: String, required: true },
  distance: { type: Number },
  style: { type: String },
  classement: { type: Number },
  notes: { type: String, default: '' },
  sessionLoad: { type: Number, min: 0, default: 0 },
  fatigueLevel: { type: Number, min: 1, max: 10 },
  techniqueScore: { type: Number, min: 1, max: 10 },
  consistencyScore: { type: Number, min: 1, max: 10 },
  strokeEfficiency: { type: Number, min: 0, max: 100 },
  enduranceScore: { type: Number, min: 0, max: 100 },
  sprintScore: { type: Number, min: 0, max: 100 },
  coachComment: { type: String, default: '' },
  analysisStatus: {
    type: String,
    enum: ['pending', 'processed'],
    default: 'pending'
  },
  predictionReady: { type: Boolean, default: false },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

PerformanceSchema.index({ nageur: 1, date: 1 });

module.exports = mongoose.model('Performance', PerformanceSchema);
