const mongoose = require('mongoose');

const SwimmerBaselineSchema = new mongoose.Schema({
  nageur: { type: mongoose.Schema.Types.ObjectId, ref: 'Nageur', required: true, unique: true },

  // Personal bests per stroke in seconds
  personalBests: {
    freestyle_100m:  { type: Number, default: null },
    backstroke_100m: { type: Number, default: null },
    breaststroke_100m: { type: Number, default: null },
    butterfly_100m:  { type: Number, default: null }
  },

  // Load targets
  weeklyLoadTargetKm: { type: Number, default: 20 },
  maxConsecutiveTrainingDays: { type: Number, default: 5 },

  // Auto-computed rolling stats (updated by AI engine after each session)
  rolling7DayLoad: { type: Number, default: 0 },         // km in last 7 days
  rolling14DayLoad: { type: Number, default: 0 },        // km in last 14 days
  consecutiveTrainingDays: { type: Number, default: 0 }, // streak without rest
  avgRpeLast3Sessions: { type: Number, default: null },   // average RPE score
  lastSessionDate: { type: Date, default: null }

}, { timestamps: true });

module.exports = mongoose.model('SwimmerBaseline', SwimmerBaselineSchema);
