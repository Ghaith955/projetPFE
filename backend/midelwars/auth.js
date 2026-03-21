const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    try {
        // Vérifier la présence de l'en-tête Authorization
        const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
        if (!authHeader) {
            return res.status(401).json({ message: 'Authentification échouée : Aucun token fourni' });
        }

        // Extraire le token du format 'Bearer <token>'
        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

        // Vérifier et décoder le token
        jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
            if (err) {
                console.error('❌ Erreur lors de la vérification du token:', err.message);
                return res.status(401).json({ message: 'Authentification échouée : Token invalide ou expiré' });
            }

            console.log('✅ Token décodé:', decodedToken);

            // Attacher les informations de l'utilisateur à la requête
            req.user = {
                userId: decodedToken.userId,
                role: decodedToken.role
            };

            next();
        });
    } catch (error) {
        console.error(' Erreur inattendue lors de la vérification du token:', error.message);
        return res.status(401).json({ message: 'Authentification échouée : Erreur interne' });
    }
};

module.exports = authenticateToken;
