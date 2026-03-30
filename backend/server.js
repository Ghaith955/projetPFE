const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const app = require('./app');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connecté à MongoDB'))
  .catch((err) => console.log('Erreur de connexion à MongoDB:', err));

const port = process.env.PORT || 3300;
app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});