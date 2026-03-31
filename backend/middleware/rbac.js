const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Accès interdit : rôle non défini.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès interdit : permissions insuffisantes.' });
    }

    next();
  };
};

module.exports = roleMiddleware;
