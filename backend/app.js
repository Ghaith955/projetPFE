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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Erreur globale:', err);
  res.status(500).json({ message: 'Erreur serveur interne.' });
});

module.exports = app;