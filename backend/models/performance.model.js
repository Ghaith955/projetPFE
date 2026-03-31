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
  temps: { type: String, required: true },
  distance: { type: Number },
  style: { type: String },
  classement: { type: Number },
  notes: { type: String, default: '' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Performance', PerformanceSchema);
