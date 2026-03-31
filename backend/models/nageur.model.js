const mongoose = require('mongoose');

const NageurSchema = new mongoose.Schema({
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  age: { type: Number, default: 18 },
  sexe: {
    type: String,
    enum: ['Masculin', 'Féminin', 'Autre'],
    default: 'Masculin'
  },
  poid: { type: String, default: '0' },
  specialite: { type: [String], default: [] },
  club: { type: String, default: '' },
  competitions: [{
    nom: String,
    date: Date,
    classement: Number
  }],
  entraineur: { type: mongoose.Schema.Types.ObjectId, ref: 'Entraineur' }
}, { timestamps: true });

module.exports = mongoose.model('Nageur', NageurSchema);