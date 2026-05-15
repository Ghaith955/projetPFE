const User = require('../models/user.model');
const Nageur = require('../models/nageur.model');
const Entraineur = require('../models/entraineur.model');
const Competition = require('../models/competition.model');
const Entrainement = require('../models/entrainement.model');
const Cotisation = require('../models/cotisation.model');
const Demande = require('../models/demande.model');
const IDSSDecision = require('../models/idssDecision.model');
const Performance = require('../models/performance.model');
const bcrypt = require('bcryptjs');
const { sendMail } = require('../utils/sendEmail');
const { buildApprovalEmail, getLogoAttachment } = require('../utils/emailTemplates');

const adminController = {};

// GET /admin/idss-evaluations/latest - Latest AI evaluation summary
adminController.getLatestIdssEvaluation = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const col = mongoose.connection.db.collection('idss_evaluations');
    const docs = await col.find({}).sort({ timestamp: -1 }).limit(1).toArray();
    res.json(docs[0] || null);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération évaluation IDSS.', error: error.message });
  }
};

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
      isActive: isActive !== undefined ? isActive : true,
      status: isActive === false ? 'PENDING' : 'APPROVED'
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
    if (isActive !== undefined) {
      updateData.isActive = isActive;
      updateData.status = isActive ? 'APPROVED' : 'PENDING';
    }
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
    user.status = user.isActive ? 'APPROVED' : 'PENDING';
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

    const nageurSpecialites = Array.isArray(nageur.specialite) ? nageur.specialite : [];
    const coachSpecialites = Array.isArray(entraineur.specialites) ? entraineur.specialites : [];
    const hasMatch = nageurSpecialites.some((spec) => coachSpecialites.includes(spec));
    if (nageurSpecialites.length > 0 && coachSpecialites.length > 0 && !hasMatch) {
      return res.status(400).json({ message: 'Specialite incompatible entre le nageur et l\'entraineur.' });
    }

    if (nageur.entraineur && String(nageur.entraineur) !== String(entraineur._id)) {
      await Entraineur.findByIdAndUpdate(nageur.entraineur, { $pull: { nageurs: nageur._id } });
    }

    nageur.entraineur = entraineur._id;
    await nageur.save();

    if (!entraineur.nageurs.includes(nageur._id)) {
      entraineur.nageurs.push(nageur._id);
      await entraineur.save();
    }

    const populatedNageur = await Nageur.findById(nageur._id)
      .populate('utilisateur', 'nom prenom email phone imageprofile isActive')
      .populate({
        path: 'entraineur',
        select: 'specialites utilisateur',
        populate: { path: 'utilisateur', select: 'nom prenom email' }
      });

    res.status(200).json({ message: 'Nageur affecte avec succes !', nageur: populatedNageur, entraineur });
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

    const [aiMonitored, latestDecisions] = await Promise.all([
      IDSSDecision.distinct('nageur').then((ids) => ids.length),
      IDSSDecision.aggregate([
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$nageur', doc: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$doc' } }
      ])
    ]);

    const atRiskCount = latestDecisions.filter((d) => d.fatigueLevel === 'HIGH' || d.fatigueLevel === 'CRITICAL').length;
    const totalAnalyzed = latestDecisions.length;

    const now = new Date();
    const day7 = new Date(now); day7.setDate(now.getDate() - 7);
    const day28 = new Date(now); day28.setDate(now.getDate() - 28);

    const loadAgg = await Performance.aggregate([
      { $match: { type: 'Entrainement', date: { $gte: day28 } } },
      {
        $group: {
          _id: '$nageur',
          load28: { $sum: { $ifNull: ['$distance', 0] } },
          load7: {
            $sum: {
              $cond: [
                { $gte: ['$date', day7] },
                { $ifNull: ['$distance', 0] },
                0
              ]
            }
          }
        }
      }
    ]);

    const acwrVals = loadAgg
      .map((d) => {
        const chronic = (d.load28 || 0) / 4;
        return chronic > 0 ? d.load7 / chronic : 0;
      })
      .filter((v) => v > 0);
    const avgAcwr = acwrVals.length
      ? +(acwrVals.reduce((a, b) => a + b, 0) / acwrVals.length).toFixed(2)
      : 0;

    const atRiskRatio = totalAnalyzed ? atRiskCount / totalAnalyzed : 0;
    let teamStatus = { label: 'Bon', level: 'good' };
    if (atRiskRatio >= 0.3 || avgAcwr >= 1.45) {
      teamStatus = { label: 'Risque', level: 'bad' };
    } else if (atRiskRatio >= 0.15 || avgAcwr >= 1.3) {
      teamStatus = { label: 'Moyen', level: 'warn' };
    }

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
      aiMonitored,
      atRiskCount,
      avgAcwr,
      teamStatus,
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
    const pendingUsers = await User.find({
      $or: [
        { status: 'PENDING' },
        { status: { $exists: false }, isActive: false }
      ]
    })
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
      user.status = 'APPROVED';
      await user.save();

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      const logoAttachment = getLogoAttachment();
      const attachments = logoAttachment ? [logoAttachment] : [];
      const approvalHtml = buildApprovalEmail({
        user,
        loginUrl: `${frontendUrl}/login`,
        logoCid: logoAttachment ? logoAttachment.cid : null
      });

      await Promise.allSettled([
        sendMail(user.email, 'Votre compte est approuve', approvalHtml, true, undefined, attachments)
      ]);

      res.json({ message: 'Inscription approuvée !', user: { id: user._id, isActive: true, status: user.status } });
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
