const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  candidateName: { type: String, required: true },
  targetRole: { type: String, required: true },
  company: { type: String, default: 'Target Enterprise' },
  jobDescriptionText: String,
  resumeText: String,
  fitScore: { type: Number, default: 0 },
  isSuitable: { type: Boolean, default: true },
  suitabilitySummary: String,
  coverLetter: String,
  emailPitch: String,
  atsKeywords: [String],
  keySellingPoints: [String],
  applicationTips: [String],
  submissionConfirmationId: String,
  agentActionLog: [String],
  status: { 
    type: String, 
    enum: ['Submitted', 'Under Review', 'Interview Scheduled', 'Offered', 'Rejected'], 
    default: 'Submitted' 
  },
  appliedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', applicationSchema);
