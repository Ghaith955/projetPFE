const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const nageurRoutes = require('./routes/nageurRoutes');
const entraineurRoutes = require('./routes/entraineurRoutes');
const competitionRoutes = require('./routes/competitionRoutes');
const entrainementRoutes = require('./routes/entrainementRoutes');
const cotisationRoutes = require('./routes/cotisationRoutes');
const demandeRoutes = require('./routes/demandeRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/nageurs', nageurRoutes);
app.use('/entraineurs', entraineurRoutes);
app.use('/competitions', competitionRoutes);
app.use('/planning', entrainementRoutes);
app.use('/cotisations', cotisationRoutes);
app.use('/demandes', demandeRoutes);
app.use('/performances', performanceRoutes);
app.use('/password', passwordRoutes);
app.use('/chat', chatRoutes);
app.use('/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public stats for landing page (no auth required)
app.get('/api/stats', async (req, res) => {
  try {
    const Nageur = require('./models/nageur.model');
    const Competition = require('./models/competition.model');
    const Entrainement = require('./models/entrainement.model');
    const Entraineur = require('./models/entraineur.model');

    const [nageurs, competitions, entrainements, entraineurs] = await Promise.all([
      Nageur.countDocuments(),
      Competition.countDocuments(),
      Entrainement.countDocuments(),
      Entraineur.countDocuments()
    ]);

    res.json({
      nageurs,
      competitions,
      entrainements,
      entraineurs
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.json({ nageurs: 0, competitions: 0, entrainements: 0, entraineurs: 0 });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Erreur globale:', err);
  res.status(500).json({ message: 'Erreur serveur interne.' });
});

module.exports = app;