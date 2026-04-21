const Cotisation = require('../models/cotisation.model');
const Nageur = require('../models/nageur.model');
const { notifyNageurs } = require('../utils/notificationHelper');

const cotisationController = {};

// GET all
cotisationController.getAllCotisations = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role === 'NAGEUR') {
      const nageur = await Nageur.findOne({ utilisateur: req.user.userId });
      if (!nageur) return res.status(200).json([]);
      filter.nageur = nageur._id;
    }

    const cotisations = await Cotisation.find(filter)
      .populate({ path: 'nageur', populate: { path: 'utilisateur', select: 'nom prenom email' } })
      .sort({ createdAt: -1 });
    res.status(200).json(cotisations);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération.', error: error.message });
  }
};

// GET by id
cotisationController.getCotisationById = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user?.role === 'NAGEUR') {
      const nageur = await Nageur.findOne({ utilisateur: req.user.userId });
      if (!nageur) return res.status(404).json({ message: 'Cotisation non trouvée.' });
      filter.nageur = nageur._id;
    }

    const cotisation = await Cotisation.findOne(filter)
      .populate({ path: 'nageur', populate: { path: 'utilisateur', select: 'nom prenom email' } });
    if (!cotisation) return res.status(404).json({ message: 'Cotisation non trouvée.' });
    res.status(200).json(cotisation);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

// POST create
cotisationController.createCotisation = async (req, res) => {
  try {
    const { nageur, montant, dateDebut, dateFin, statut, modePaiement, notes } = req.body;
    const cotisation = new Cotisation({ nageur, montant, dateDebut, dateFin, statut, modePaiement, notes });
    await cotisation.save();

    await notifyNageurs({
      nageurIds: [nageur],
      title: 'Nouvelle cotisation',
      message: `Une nouvelle cotisation a ete ajoutee pour la periode du ${new Date(dateDebut).toLocaleDateString('fr-FR')} au ${new Date(dateFin).toLocaleDateString('fr-FR')}.`,
      type: 'cotisation',
      resourceType: 'Cotisation',
      resourceId: cotisation._id,
      createdBy: req.user.userId
    });

    res.status(201).json({ message: 'Cotisation créée avec succès!', cotisation });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création.', error: error.message });
  }
};

// PUT update
cotisationController.updateCotisation = async (req, res) => {
  try {
    const { nageur, montant, dateDebut, dateFin, statut, modePaiement, notes } = req.body;
    const cotisation = await Cotisation.findByIdAndUpdate(
      req.params.id,
      { nageur, montant, dateDebut, dateFin, statut, modePaiement, notes },
      { new: true }
    ).populate({ path: 'nageur', populate: { path: 'utilisateur', select: 'nom prenom email' } });
    if (!cotisation) return res.status(404).json({ message: 'Cotisation non trouvée.' });

    await notifyNageurs({
      nageurIds: [cotisation.nageur?._id || nageur],
      title: 'Mise a jour de cotisation',
      message: `Votre cotisation a ete mise a jour (statut: ${cotisation.statut}).`,
      type: 'cotisation',
      resourceType: 'Cotisation',
      resourceId: cotisation._id,
      createdBy: req.user.userId
    });

    res.status(200).json({ message: 'Cotisation mise à jour!', cotisation });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour.', error: error.message });
  }
};

// DELETE
cotisationController.deleteCotisation = async (req, res) => {
  try {
    const cotisation = await Cotisation.findByIdAndDelete(req.params.id);
    if (!cotisation) return res.status(404).json({ message: 'Cotisation non trouvée.' });
    res.status(200).json({ message: 'Cotisation supprimée!' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression.', error: error.message });
  }
};

// GET stats
cotisationController.getStats = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.role === 'NAGEUR') {
      const nageur = await Nageur.findOne({ utilisateur: req.user.userId });
      if (!nageur) return res.status(200).json({ total: 0, totalMontant: 0, paye: 0, enAttente: 0, enRetard: 0, montantPercu: 0 });
      filter.nageur = nageur._id;
    }

    const all = await Cotisation.find(filter);
    const stats = {
      total: all.length,
      totalMontant: all.reduce((sum, c) => sum + c.montant, 0),
      paye: all.filter(c => c.statut === 'Payé').length,
      enAttente: all.filter(c => c.statut === 'En attente').length,
      enRetard: all.filter(c => c.statut === 'En retard').length,
      montantPercu: all.filter(c => c.statut === 'Payé').reduce((sum, c) => sum + c.montant, 0)
    };
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Erreur.', error: error.message });
  }
};

module.exports = cotisationController;
