const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
  candidateName: { type: String, required: true },
  candidateEmail: { type: String, required: true },
  targetRole: { type: String, required: true },
  totalMarks: { type: Number, default: 100 },
  scoreObtained: { type: Number, required: true },
  percentage: { type: Number, required: true },
  grade: { type: String, enum: ['Pass (Distinction)', 'Pass', 'Needs Improvement', 'Fail'], default: 'Pass' },
  integrityScore: { type: Number, default: 100 }, // Anti-proxy cheat detection %
  proctoringLogs: [{ type: String }],
  skillBreakdown: [{
    skill: String,
    marksObtained: Number,
    maxMarks: Number
  }],
  answers: [{
    questionId: String,
    question: String,
    candidateAnswer: String,
    marksAwarded: Number,
    maxMarks: Number,
    feedback: String
  }],
  completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ExamResult', examResultSchema);
