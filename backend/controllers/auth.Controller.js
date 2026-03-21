const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Role = require('../models/role.model'); 
const path = require('path');

const authController = {};

authController.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email et mot de passe requis." });
        }

        const user = await User.findOne({ email }).populate('role'); // On récupère aussi le rôle
        if (!user) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect." });
        }

        if(!user.isActive){
            return res.status(403).json({message:"Votre compte n'est pas encore activé."})
        }

        // Vérifier le mot de passe
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect." });
        }

        // Générer un token JWT
        const token = jwt.sign(
            { userId: user._id, role: user.role ? user.role.nom : null }, // Retourner le rôle exact ou null si pas de rôle
            process.env.JWT_SECRET,
            { expiresIn: "7d" } // Expiration du token après 7 jours
        );

        // Répondre avec le token et les infos de l'utilisateur
        res.status(200).json({
            message: "Connexion réussie.",
            token,
            user: {
                id: user._id,
                nom: user.nom,
                prenom: user.prenom,
                email: user.email,
                phone: user.phone,
                role: user.role ? user.role.nom : "Aucun rôle assigné"
            }
        });

        console.log(token);
    } catch (error) {
        console.error(" Erreur lors de la connexion:", error);
        res.status(500).json({ message: "Erreur serveur. Veuillez réessayer plus tard." });
    }
};

authController.logout=(req,res)=>{
    try{
        res.clearCookie('token', {path:'/'});
        req.user= null;

        res.status(200).json({message:"Déconnexion réeussie"});
    }catch(error){
        console.log("Eurreur lors de la déconnexion",error);
        res.status(500).json({message:"Erreur serveur."})
    }
};

authController.getUserInfo = async (req, res) => {
    try {
        const userId = req.user.userId; // Assurez-vous que l'utilisateur est authentifié et que son ID est dans `req.user.userId`
        console.log("ID de l'utilisateur:", userId); // Log pour vérifier l'ID utilisateur

        // Récupérer l'utilisateur avec le rôle peuplé
        const user = await User.findById(userId)
            .populate('role', 'nom description')  // Peupler le champ 'role' avec les champs 'nom' et 'description'
            .select('nom prenom imageprofile role');  // Sélectionner les champs 'nom', 'prenom', 'imageprofile', et 'role'

        console.log("Utilisateur trouvé:", user); // Log pour afficher l'utilisateur trouvé

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        res.json({
            nom: user.nom,
            prenom: user.prenom,
            imageprofile: user.imageprofile || 'assets/images/default-user.jpg',
            role: user.role ? user.role.nom : null // Si un rôle est trouvé, afficher le nom du rôle
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};
module.exports = authController;
