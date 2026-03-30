const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const nageurRoutes = require('./routes/nageurRoutes');
const entraineurRoutes = require('./routes/entraineurRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const userRoutes = require('./routes/userRoutes');
const competitionRoutes = require('./routes/competitionRoutes');
const entrainementRoutes = require('./routes/entrainementRoutes');
const cotisationRoutes = require('./routes/cotisationRoutes');
const nageurEntraineurRoutes = require('./routes/entraineurNageurRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/auth', authRoutes);
app.use('/roles', roleRoutes);
app.use('/nageurs', nageurRoutes);
app.use('/entraineurs', entraineurRoutes);
app.use('/password', passwordRoutes);
app.use('/users', userRoutes);
app.use('/competitions', competitionRoutes);
app.use('/planning', entrainementRoutes);
app.use('/cotisations', cotisationRoutes);

// ✅ Route finale pour affectation automatique
app.use('/entraineur-Nageur', nageurEntraineurRoutes);

module.exports = app;