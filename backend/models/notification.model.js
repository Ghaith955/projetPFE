const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['competition', 'planning', 'cotisation', 'general'],
    default: 'general',
    index: true
  },
  resourceType: {
    type: String,
    enum: ['Competition', 'Entrainement', 'Cotisation', 'Other'],
    default: 'Other'
  },
  resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isRead: { type: Boolean, default: false, index: true }
}, { timestamps: true });

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
