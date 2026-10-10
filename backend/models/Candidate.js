const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  email: String,
  phone: String,
  resumeText: { type: String, required: true },
  originalFileName: String,
  jobDescriptionText: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  
  // Scoring
  scores: {
    skills: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    education: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    overall: { type: Number, default: 0 }
  },

  // Analysis Details
  total_experience_years: { type: Number, default: 0 },
  education_summary: String,
  recommendation: { type: String, enum: ['Strong Hire', 'Interview', 'Maybe', 'Reject', 'Pending'], default: 'Pending' },
  summary: String,
  
  matched_skills: [{
    skill: String,
    evidence: String,
    level: String
  }],
  partial_skills: [String],
  gaps: [{
    skill: String,
    importance: String,
    learning_tip: String
  }],
  strengths: [String],
  red_flags: [String],
  resume_tips: [String],
  
  // Generated Interview Questions
  questions: [{
    question: String,
    category: String,
    targets: String,
    difficulty: String,
    good_answer_signals: String,
    follow_up: String
  }],
  
  // Local check results
  ats_checks: [{
    label: String,
    passed: Boolean
  }],

  // Candidate Actions (Jobs, Emails)
  status: { type: String, enum: ['Pending', 'Shortlist', 'On hold', 'Rejected'], default: 'Pending' },
  note: String,

  // 100-Mark Anti-Proxy Proctored Exam Scorecard
  proctoredExam: {
    totalMarks: { type: Number, default: 100 },
    scoreObtained: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    grade: { type: String, default: 'Not Taken' },
    integrityScore: { type: Number, default: 100 },
    completedAt: Date,
    proctoringLogs: [String],
    answers: [{
      questionId: String,
      question: String,
      candidateAnswer: String,
      marksAwarded: Number,
      maxMarks: Number,
      feedback: String
    }]
  }
});

module.exports = mongoose.model('Candidate', candidateSchema);
