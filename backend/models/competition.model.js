const mongoose = require('mongoose');

const CompetitionSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  date: { type: Date, required: true },
  lieu: { type: String, required: true },
  description: { type: String, default: '' },
  niveauRequis: {
    type: String,
    enum: ['Débutant', 'Intermédiaire', 'Confirmé', 'Expert'],
    default: 'Intermédiaire'
  },
  statut: {
    type: String,
    enum: ['À venir', 'En cours', 'Terminée', 'Annulée'],
    default: 'À venir'
  },
  nageurs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Nageur' }],
  resultats: [
    {
      nageur: { type: mongoose.Schema.Types.ObjectId, ref: 'Nageur' },
      classement: Number,
      temps: String,
      medaille: { type: String, enum: ['Or', 'Argent', 'Bronze', 'Aucune'], default: 'Aucune' }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Competition', CompetitionSchema);
