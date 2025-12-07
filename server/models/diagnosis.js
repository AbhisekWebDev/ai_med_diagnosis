const mongoose = require('mongoose');

const DiagnosisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  symptoms: String,
  predictedDisease: String,
  confidenceScore: String,
  advice: String,
  medicines: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Diagnosis', DiagnosisSchema);