const mongoose = require('mongoose');

const CotisationSchema = new mongoose.Schema({
  nageur: { type: mongoose.Schema.Types.ObjectId, ref: 'Nageur', required: true },
  montant: { type: Number, required: true },
  dateDebut: { type: Date, required: true },
  dateFin: { type: Date, required: true },
  statut: {
    type: String,
    enum: ['Payé', 'En attente', 'En retard', 'Annulé'],
    default: 'En attente'
  },
  modePaiement: {
    type: String,
    enum: ['Espèces', 'Virement', 'Chèque', 'Carte'],
    default: 'Espèces'
  },
  notes: { type: String, default: '' },
  facturePath: { type: String, default: '' },
  factureNumber: { type: String, default: '' },
  paidAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Cotisation', CotisationSchema);
