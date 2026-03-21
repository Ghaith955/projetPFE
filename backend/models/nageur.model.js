const mongoose=require("mongoose") ;
const Schema = mongoose.Schema;  // Ajouter cette ligne pour référencer Schema

const NageurSchema = new mongoose.Schema({
utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  
  age: {
    type: Number,
    required: true,
  },
  sexe: {
    type: String,
    enum: ["Homme", "Femme", "Autre"],
    required: true,
  },
  poid: {
    type: String,
    required: true,
  },
  specialite: {
    type: [String], 
    required: true,
  },
 
  competitions: [
    {
      nom: String,
      date: Date,
      classement: Number,
    },
  ],
 
});

module.exports=mongoose.model('Nageur', NageurSchema); 