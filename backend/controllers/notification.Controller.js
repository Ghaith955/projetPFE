const Notification = require('../models/notification.model');

const notificationController = {};

notificationController.getMyNotifications = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

    const notifications = await Notification.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({
      user: req.user.userId,
      isRead: false
    });

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des notifications.', error: error.message });
  }
};

notificationController.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée.' });
    }

    res.status(200).json({ message: 'Notification marquée comme lue.', notification });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour.', error: error.message });
  }
};

notificationController.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: 'Toutes les notifications sont marquées comme lues.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour globale.', error: error.message });
  }
};

module.exports = notificationController;
