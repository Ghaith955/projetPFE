const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config(); // Charger les variables d'environnement depuis .env

const app = require('./app'); // Importer la configuration de l'application

// Connexion à MongoDB sans options obsolètes
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connecté à MongoDB'))
  .catch((err) => console.log('Erreur de connexion à MongoDB:', err));

// Démarrer le serveur
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Serveur démarré sur le port ${port}');
});