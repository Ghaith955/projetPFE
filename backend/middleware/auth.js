const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
    const queryToken = req.query?.token;
    if (!authHeader && !queryToken) {
      return res.status(401).json({ message: 'Authentification requise : aucun token fourni.' });
    }

    const token = queryToken || (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Token invalide ou expiré.' });
      }
      req.user = {
        userId: decoded.userId,
        role: decoded.role
      };
      next();
    });
  } catch (error) {
    return res.status(401).json({ message: 'Erreur d\'authentification.' });
  }
};

module.exports = authenticateToken;
