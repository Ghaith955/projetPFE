const Demande = require('../models/demande.model');
const Nageur = require('../models/nageur.model');
const Entraineur = require('../models/entraineur.model');

const demandeController = {};

// POST /demandes - Create a demande (nageur only)
demandeController.create = async (req, res) => {
  try {
    const { entrainementId, reason } = req.body;

    const nageur = await Nageur.findOne({ utilisateur: req.user.userId });
    if (!nageur) return res.status(404).json({ message: 'Profil nageur introuvable.' });

    const demande = new Demande({
      nageur: nageur._id,
      entrainement: entrainementId,
      reason
    });

    await demande.save();
    res.status(201).json({ message: 'Demande envoyée avec succès !', demande });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// GET /demandes - Get demandes based on role
demandeController.getAll = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'NAGEUR') {
      const nageur = await Nageur.findOne({ utilisateur: req.user.userId });
      if (nageur) filter.nageur = nageur._id;
    } else if (req.user.role === 'ENTRAINEUR') {
      const entraineur = await Entraineur.findOne({ utilisateur: req.user.userId });
      if (entraineur) {
        const nageurIds = entraineur.nageurs;
        filter.nageur = { $in: nageurIds };
      }
    }
    // ADMIN sees all - no filter

    const demandes = await Demande.find(filter)
      .populate({
        path: 'nageur',
        populate: { path: 'utilisateur', select: 'nom prenom email imageprofile' }
      })
      .populate('entrainement', 'titre date heureDebut heureFin')
      .populate('respondedBy', 'nom prenom')
      .sort({ createdAt: -1 });

    res.json(demandes);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// PATCH /demandes/:id/respond - Accept or reject
demandeController.respond = async (req, res) => {
  try {
    const { status, responseNote } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }

    if (req.user?.role === 'ENTRAINEUR') {
      const entraineur = await Entraineur.findOne({ utilisateur: req.user.userId });
      if (!entraineur) return res.status(403).json({ message: 'Acces interdit.' });
      const existing = await Demande.findById(req.params.id).select('nageur');
      if (!existing) return res.status(404).json({ message: 'Demande introuvable.' });
      const allowed = entraineur.nageurs.some((id) => String(id) === String(existing.nageur));
      if (!allowed) return res.status(403).json({ message: 'Acces interdit.' });
    }

    const demande = await Demande.findByIdAndUpdate(
      req.params.id,
      {
        status,
        responseNote: responseNote || '',
        respondedBy: req.user.userId,
        respondedAt: new Date()
      },
      { new: true }
    )
    .populate({ path: 'nageur', populate: { path: 'utilisateur', select: 'nom prenom' } })
    .populate('entrainement', 'titre date');

    if (!demande) return res.status(404).json({ message: 'Demande introuvable.' });

    res.json({ message: `Demande ${status === 'accepted' ? 'acceptée' : 'rejetée'}.`, demande });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// GET /demandes/pending/count
demandeController.getPendingCount = async (req, res) => {
  try {
    let filter = { status: 'pending' };

    if (req.user.role === 'ENTRAINEUR') {
      const entraineur = await Entraineur.findOne({ utilisateur: req.user.userId });
      if (entraineur) {
        filter.nageur = { $in: entraineur.nageurs };
      }
    }

    const count = await Demande.countDocuments(filter);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

module.exports = demandeController;
