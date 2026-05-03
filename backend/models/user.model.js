const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: Number },
  imageprofile: { type: String, default: '' },
  role: {
    type: String,
    enum: ['RESPONSABLE', 'ENTRAINEUR', 'NAGEUR'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED'],
    default: 'PENDING'
  },
  isActive: { type: Boolean, default: false },
  dateCreation: { type: Date, default: Date.now },
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' }
  },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
