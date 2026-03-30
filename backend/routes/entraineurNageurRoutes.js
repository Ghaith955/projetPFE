const express = require("express");
const router = express.Router();
const entraineurNageurController = require("../controllers/nageur-entraineur.Controller");

// PUT automatique : affecter un nageur à un entraîneur selon spécialité
router.post("/affecter", entraineurNageurController.affecterEntraineur);

module.exports = router;