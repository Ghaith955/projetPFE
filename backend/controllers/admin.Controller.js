const User = require('../models/user.model');
const Nageur = require('../models/nageur.model');
const Entraineur = require('../models/entraineur.model');
const Competition = require('../models/competition.model');
const Entrainement = require('../models/entrainement.model');
const Cotisation = require('../models/cotisation.model');
const Demande = require('../models/demande.model');
const bcrypt = require('bcryptjs');

const adminController = {};

// GET /admin/users - Get all users
adminController.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -resetPasswordToken -resetPasswordExpires').sort({ dateCreation: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération.', error: error.message });
  }
};

// GET /admin/users/:id - Get user by ID
adminController.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// POST /admin/users - Create user
adminController.createUser = async (req, res) => {
  try {
    const { nom, prenom, email, password, phone, role, isActive } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(password || 'default123', 10);

    let imageprofile = '';
    if (req.file) {
      imageprofile = `/uploads/${req.file.filename}`;
    }

    const newUser = new User({
      nom, prenom, email,
      password: hashedPassword,
      phone, imageprofile,
      role: role || 'NAGEUR',
      isActive: isActive !== undefined ? isActive : true
    });
    await newUser.save();

    res.status(201).json({ message: 'Utilisateur créé avec succès !', user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création.', error: error.message });
  }
};

// PUT /admin/users/:id - Update user
adminController.updateUser = async (req, res) => {
  try {
    const { nom, prenom, email, phone, role, isActive } = req.body;
    const updateData = {};
    if (nom !== undefined) updateData.nom = nom;
    if (prenom !== undefined) updateData.prenom = prenom;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (req.file) updateData.imageprofile = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    res.status(200).json({ message: 'Utilisateur mis à jour !', user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour.', error: error.message });
  }
};

// PATCH /admin/users/:id/toggle-active - Toggle user active status
adminController.toggleActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      message: `Compte ${user.isActive ? 'activé' : 'désactivé'} !`,
      user: { id: user._id, isActive: user.isActive }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// DELETE /admin/users/:id - Delete user
adminController.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });

    // Clean up related data
    await Nageur.deleteMany({ utilisateur: req.params.id });
    await Entraineur.deleteMany({ utilisateur: req.params.id });

    res.status(200).json({ message: 'Utilisateur supprimé avec succès !' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression.', error: error.message });
  }
};

// PATCH /admin/users/:id/assign-entraineur - Assign nageur to entraineur
adminController.assignNageurToEntraineur = async (req, res) => {
  try {
    const { nageurId, entraineurId } = req.body;

    const nageur = await Nageur.findById(nageurId);
    if (!nageur) return res.status(404).json({ message: 'Nageur introuvable.' });

    const entraineur = await Entraineur.findById(entraineurId);
    if (!entraineur) return res.status(404).json({ message: 'Entraîneur introuvable.' });

    nageur.entraineur = entraineur._id;
    await nageur.save();

    if (!entraineur.nageurs.includes(nageur._id)) {
      entraineur.nageurs.push(nageur._id);
      await entraineur.save();
    }

    res.status(200).json({ message: 'Nageur affecté avec succès !', nageur, entraineur });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// GET /admin/stats - Dashboard statistics
adminController.getStats = async (req, res) => {
  try {
    const [usersCount, nageursCount, entraineursCount, competitionsCount, entrainementsCount, cotisationsCount, demandesCount] = await Promise.all([
      User.countDocuments(),
      Nageur.countDocuments(),
      Entraineur.countDocuments(),
      Competition.countDocuments(),
      Entrainement.countDocuments(),
      Cotisation.countDocuments(),
      Demande.countDocuments({ status: 'pending' })
    ]);

    const recentUsers = await User.find().select('-password').sort({ createdAt: -1 }).limit(5);
    const upcomingCompetitions = await Competition.find({ date: { $gte: new Date() } }).sort({ date: 1 }).limit(5);

    res.json({
      users: usersCount,
      nageurs: nageursCount,
      entraineurs: entraineursCount,
      competitions: competitionsCount,
      entrainements: entrainementsCount,
      cotisations: cotisationsCount,
      demandesPending: demandesCount,
      recentUsers,
      upcomingCompetitions
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// GET /admin/pending-registrations - Get users awaiting approval
adminController.getPendingRegistrations = async (req, res) => {
  try {
    const pendingUsers = await User.find({ isActive: false })
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });

    // Enrich with role-specific data
    const enriched = await Promise.all(pendingUsers.map(async (user) => {
      const u = user.toObject();
      if (u.role === 'NAGEUR') {
        u.roleData = await Nageur.findOne({ utilisateur: u._id });
      } else if (u.role === 'ENTRAINEUR') {
        u.roleData = await Entraineur.findOne({ utilisateur: u._id });
      }
      return u;
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// PATCH /admin/pending-registrations/:id/approve - Approve a pending registration
adminController.approvePendingRegistration = async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé.' });

    if (action === 'approve') {
      user.isActive = true;
      await user.save();
      res.json({ message: 'Inscription approuvée !', user: { id: user._id, isActive: true } });
    } else if (action === 'reject') {
      // Delete the user and associated data
      await Nageur.deleteMany({ utilisateur: user._id });
      await Entraineur.deleteMany({ utilisateur: user._id });
      await User.findByIdAndDelete(user._id);
      res.json({ message: 'Inscription rejetée et utilisateur supprimé.' });
    } else {
      res.status(400).json({ message: 'Action invalide. Utilisez "approve" ou "reject".' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

module.exports = adminController;
