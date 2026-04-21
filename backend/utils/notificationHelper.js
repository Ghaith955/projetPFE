const Nageur = require('../models/nageur.model');
const Notification = require('../models/notification.model');

async function notifyNageurs({ nageurIds, title, message, type, resourceType, resourceId, createdBy }) {
  if (!Array.isArray(nageurIds) || nageurIds.length === 0) {
    return 0;
  }

  const uniqueNageurIds = [...new Set(nageurIds.map((id) => String(id)))];
  const nageurs = await Nageur.find({ _id: { $in: uniqueNageurIds } }).select('utilisateur');

  const uniqueUserIds = [...new Set(
    nageurs
      .map((nageur) => (nageur.utilisateur ? String(nageur.utilisateur) : null))
      .filter(Boolean)
  )];

  if (uniqueUserIds.length === 0) {
    return 0;
  }

  const docs = uniqueUserIds.map((userId) => ({
    user: userId,
    title,
    message,
    type,
    resourceType,
    resourceId,
    createdBy,
    isRead: false
  }));

  await Notification.insertMany(docs, { ordered: false });
  return docs.length;
}

module.exports = { notifyNageurs };
