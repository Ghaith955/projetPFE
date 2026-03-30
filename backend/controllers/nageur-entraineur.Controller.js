const Nageur = require("../models/nageur.model");
const Entraineur = require("../models/entraineur.model");

const entraineurNageurController = {};

// Affecter un nageur à un entraîneur manuellement
entraineurNageurController.affecterEntraineur = async (req, res) => {
  try {
    const { nageurId, entraineurId } = req.body;

    const nageur = await Nageur.findById(nageurId);
    if (!nageur) return res.status(404).json({ message: "Nageur introuvable" });

    const entraineur = await Entraineur.findById(entraineurId);
    if (!entraineur) return res.status(404).json({ message: "Entraîneur introuvable" });

    // Vérifier la correspondance des spécialités
    const specialitesCommune = nageur.specialite.filter(s =>
      entraineur.specialites.includes(s)
    );
    if (specialitesCommune.length === 0) {
      return res.status(400).json({ 
        message: "Aucune spécialité commune entre le nageur et l'entraîneur", 
        nageurSpecialites: nageur.specialite,
        entraineurSpecialites: entraineur.specialites
      });
    }

    // Affectation
    nageur.entraineur = entraineur._id;
    await nageur.save();

    if (!entraineur.nageurs.includes(nageur._id)) {
      entraineur.nageurs.push(nageur._id);
      await entraineur.save();
    }

    return res.status(200).json({
      message: "Nageur affecté manuellement avec succès",
      nageur: nageur,
      entraineur: entraineur,
      specialitesCommune: specialitesCommune
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = entraineurNageurController;