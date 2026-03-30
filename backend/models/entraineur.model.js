const mongoose=require("mongoose") ;

const EntraineurSchema = new mongoose.Schema({
 
 
 utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
 
 
  experience: {
    type: Number, // années d'expérience
    required: true,
  },
  specialites: {
    type: [String], // ex: ["Papillon", "Brasse", "Nage libre"]
    required: true,
  },

 
  certifications: [
    {
      nom: String,
      annee: Number,
    },
  ],
  dateEmbauche: {
    type: Date,
    default: Date.now,
  },
nageurs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nageur",
    },
  ],
});


module.exports= mongoose.model("Entraineur", EntraineurSchema);
