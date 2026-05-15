const Entraineur = require('../models/entraineur.model');

const getCoachSwimmerIds = async (userId) => {
  const coach = await Entraineur.findOne({ utilisateur: userId }).select('nageurs');
  return coach?.nageurs || [];
};

const ensureCoachSwimmerAccess = async (userId, swimmerId) => {
  const swimmerIds = await getCoachSwimmerIds(userId);
  return swimmerIds.some((id) => String(id) === String(swimmerId));
};

module.exports = {
  getCoachSwimmerIds,
  ensureCoachSwimmerAccess
};
