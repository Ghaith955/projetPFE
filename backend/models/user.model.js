const mongoose = require('mongoose');
const Schema = mongoose.Schema;  // Ajouter cette ligne pour référencer Schema

const userSchema = new Schema({
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: Number, required: true },
    imageprofile: { type: String },
    role: { type: Schema.Types.ObjectId, ref: 'Role', default: null },
    isActive: { type: Boolean, default: false },  // Nouveau champ pour savoir si le compte est activé
    dateCreation: { type: Date, default: Date.now },
    resetPasswordToken: { type: String, default: null }, // Champ pour le token de réinitialisation
    resetPasswordExpires: { type: Date, default: null }  // Champ pour l'expiration du token
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);  // Le modèle est bien 'User'
