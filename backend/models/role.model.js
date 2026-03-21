const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    nom: { type: String, required: true },
    description: { type: String, required: true },
});

module.exports = mongoose.model('Role', roleSchema);  // Le modèle est bien 'Role'
