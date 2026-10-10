const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  department: { type: String, default: 'Engineering', trim: true },
  location: { type: String, default: 'Remote', trim: true },
  experience: { type: String, default: '3-5 years', trim: true },
  salary: { type: String, default: 'Competitive Market Rate', trim: true },
  description: { type: String, required: true },
  requiredSkills: [{ type: String }],
  weights: {
    skills: { type: Number, default: 40 },
    experience: { type: Number, default: 25 },
    education: { type: Number, default: 10 },
    projects: { type: Number, default: 15 },
    communication: { type: Number, default: 10 }
  },
  status: { type: String, enum: ['Active', 'Draft', 'Closed'], default: 'Active' },
  recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recruiterName: String,
  companyName: String,
  applicantCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema);
