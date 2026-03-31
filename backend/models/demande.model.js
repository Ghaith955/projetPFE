const mongoose = require('mongoose');

const DemandeSchema = new mongoose.Schema({
  nageur: { type: mongoose.Schema.Types.ObjectId, ref: 'Nageur', required: true },
  entrainement: { type: mongoose.Schema.Types.ObjectId, ref: 'Entrainement', required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  responseNote: { type: String, default: '' },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  respondedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Demande', DemandeSchema);
