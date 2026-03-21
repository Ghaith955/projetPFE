const roleMiddleware = (...roles) => {
    return (req, res, next) => {
      if (!req.user || !req.user.role) {
        return res.status(403).json({ message: "Accès interdit : rôle insuffisant." });
      }
  
      // Vérifier si le rôle de l'utilisateur est inclus dans les rôles autorisés
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Accès interdit : rôle non autorisé." });
      }
  
      next();
    };
  };
  
  module.exports = roleMiddleware;
  