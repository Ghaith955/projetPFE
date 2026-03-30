const mongoose = require('mongoose');

const EntrainementSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  date: { type: Date, required: true },
  heureDebut: { type: String, required: true },
  heureFin: { type: String, required: true },
  type: {
    type: String,
    enum: ['Endurance', 'Vitesse', 'Technique', 'Force', 'Récupération'],
    default: 'Endurance'
  },
  intensite: {
    type: String,
    enum: ['Faible', 'Modérée', 'Élevée', 'Maximale'],
    default: 'Modérée'
  },
  duree: { type: Number, required: true }, // en minutes
  lieu: { type: String, default: 'Piscine principale' },
  description: { type: String, default: '' },
  entraineur: { type: mongoose.Schema.Types.ObjectId, ref: 'Entraineur' },
  nageurs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Nageur' }],
  statut: {
    type: String,
    enum: ['Planifié', 'En cours', 'Terminé', 'Annulé'],
    default: 'Planifié'
  }
}, { timestamps: true });

module.exports = mongoose.model('Entrainement', EntrainementSchema);
