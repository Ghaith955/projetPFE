const mongoose = require('mongoose');

const EntraineurSchema = new mongoose.Schema({
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  experience: { type: Number, required: true },
  specialites: { type: [String], required: true },
  numeroCertification: { type: String, default: '' },
  diplome: { type: String, default: '' },
  certifications: [{
    nom: String,
    annee: Number
  }],
  dateEmbauche: { type: Date, default: Date.now },
  nageurs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Nageur' }]
}, { timestamps: true });

module.exports = mongoose.model('Entraineur', EntraineurSchema);
