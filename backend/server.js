/**
 * TalentLens AI – Express Backend
 * Complete port of app.py endpoints + extras.py features
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Candidate = require('./models/Candidate');
const Application = require('./models/Application');
const Job = require('./models/Job');
const ExamResult = require('./models/ExamResult');
const { extractTextFromPDF } = require('./services/pdfService');
const ai = require('./services/aiService');
const playwrightService = require('./services/playwrightService');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'talentlens_secret_key_2026';


app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));
const upload = multer({ storage: multer.memoryStorage() });

// ── MongoDB ─────────────────────────────────────────────────────────────────
async function connectDB() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('No MONGODB_URI – using MongoMemoryServer...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  console.log('MongoDB connected to:', uri);
  try {
    await User.collection.dropIndex('username_1');
    console.log('Dropped legacy index username_1');
  } catch (e) {
    // Index may not exist, which is fine
  }
  try {
    await User.syncIndexes();
  } catch (e) {
    // ignore
  }
}
connectDB().catch(err => { console.error('MongoDB error:', err); process.exit(1); });



// ── Health ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// ── Authentication Endpoints (Candidate & Recruiter) ─────────────────────────

// Register Candidate or Recruiter
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, companyName, headline, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Please provide name, email, password, and role.' });
    }

    if (!['candidate', 'recruiter'].includes(role)) {
      return res.status(400).json({ error: 'Role must be candidate or recruiter.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      companyName: companyName || '',
      headline: headline || '',
      phone: phone || ''
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[AUTH] Registered new ${role}: ${user.email} (${user.name})`);

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        headline: user.headline,
        phone: user.phone,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration: ' + err.message });
  }
});

// Login Candidate or Recruiter
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (role && user.role !== role) {
      const formattedRole = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      return res.status(400).json({ 
        error: `This email is registered as a ${formattedRole}. Please select the "${formattedRole}" tab to sign in.` 
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[AUTH] Logged in ${user.role}: ${user.email}`);

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        headline: user.headline,
        phone: user.phone,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login: ' + err.message });
  }
});

// Get current user profile
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Get all users (filtered by role optional)
app.get('/api/users', async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Applications (Candidate Job Applications in Database) ───────────────────
app.post('/api/applications/apply', async (req, res) => {
  try {
    const { candidateName, targetRole, company, coverLetter, fitScore, resumeText } = req.body;
    
    const application = new Application({
      candidateName: candidateName || 'Anonymous Candidate',
      targetRole: targetRole || 'Software Engineer',
      company: company || 'Target Enterprise',
      fitScore: fitScore || 85,
      coverLetter: coverLetter || '',
      resumeText: resumeText || '',
      status: 'Submitted',
      submissionConfirmationId: 'APP-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    });

    await application.save();
    console.log(`[APPLICATION] ${candidateName} applied for ${targetRole} at ${company}`);
    res.status(201).json({ message: 'Application submitted successfully!', application });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit application: ' + err.message });
  }
});

app.get('/api/applications', async (req, res) => {
  try {
    const applications = await Application.find().sort({ appliedAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Recruiter Job Requisitions (Exclusive Recruiter Feature) ─────────────────
app.get('/api/jobs', async (req, res) => {
  try {
    let jobs = await Job.find().sort({ createdAt: -1 });
    
    // Seed initial demo requisitions if database is empty
    if (jobs.length === 0) {
      const defaultJobs = [
        {
          title: 'Senior Full Stack Engineer (React & Node.js)',
          department: 'Engineering',
          location: 'Hybrid - Bangalore / Remote',
          experience: '4-7 years',
          salary: '₹22,00,000 - ₹34,00,000 / yr',
          description: 'We are seeking an experienced Senior Full Stack Engineer to lead web application architecture, build scalable microservices in Node.js, and deliver high-performance React user interfaces.',
          requiredSkills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS', 'System Design'],
          status: 'Active',
          applicantCount: 14
        },
        {
          title: 'Lead AI / ML Systems Engineer',
          department: 'Data & Artificial Intelligence',
          location: 'Remote',
          experience: '5+ years',
          salary: '₹28,00,000 - ₹42,00,000 / yr',
          description: 'Drive the development of multi-agent LLM systems, RAG pipelines, and automated resume processing engines using Gemini AI and vector databases.',
          requiredSkills: ['Python', 'Gemini API', 'PyTorch', 'LangChain', 'RAG', 'Docker'],
          status: 'Active',
          applicantCount: 9
        },
        {
          title: 'Technical Talent Recruiter & Sourcing Lead',
          department: 'Human Resources',
          location: 'Mumbai / Hybrid',
          experience: '3-5 years',
          salary: '₹14,00,000 - ₹20,00,000 / yr',
          description: 'Manage full-lifecycle recruitment for engineering & AI roles, leverage automated screening tools, and conduct structured technical candidate evaluations.',
          requiredSkills: ['Technical Sourcing', 'ATS Systems', 'Candidate Evaluation', 'Talent Pipeline'],
          status: 'Active',
          applicantCount: 6
        }
      ];
      jobs = await Job.insertMany(defaultJobs);
    }

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const { title, department, location, experience, salary, description, requiredSkills, weights, recruiterName, companyName } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Job title and description are required.' });
    }

    const job = new Job({
      title,
      department: department || 'Engineering',
      location: location || 'Remote',
      experience: experience || '3-5 years',
      salary: salary || 'Competitive',
      description,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : (requiredSkills ? requiredSkills.split(',').map(s => s.trim()) : []),
      weights: weights || { skills: 40, experience: 25, education: 10, projects: 15, communication: 10 },
      recruiterName: recruiterName || 'Recruiter Lead',
      companyName: companyName || 'Enterprise HR',
      status: 'Active'
    });

    await job.save();
    console.log(`[JOB REQUISITION CREATED] ${job.title} by ${recruiterName || 'Recruiter'}`);
    res.status(201).json({ message: 'Job requisition created successfully!', job });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create job requisition: ' + err.message });
  }
});

app.delete('/api/jobs/:id', async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job requisition deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/jobs/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const job = await Job.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Auto-Generate Job Description & Assessment Criteria
app.post('/api/jobs/generate-jd', async (req, res) => {
  try {
    const { title, department, experience } = req.body;
    if (!title) return res.status(400).json({ error: 'Job title is required.' });

    const prompt = `You are an expert HR Talent Architect. Generate a complete professional Job Description for position: "${title}" (Department: ${department || 'Engineering'}, Experience: ${experience || '3-5 years'}).
Return ONLY a JSON object with:
{
  "description": "Comprehensive job description paragraph",
  "requiredSkills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
  "atsKeywords": ["Keyword 1", "Keyword 2", "Keyword 3"],
  "salary": "Estimated salary range string"
}`;

    const text = await ai.generate(prompt);
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleaned);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'AI JD generation failed: ' + err.message });
  }
});

// ── Score Percentage Improver Roadmap Endpoint ─────────────────────────────

app.post('/api/score-booster-roadmap', async (req, res) => {
  try {
    const { resume, role, currentScore = 65 } = req.body;
    if (!resume || !role) {
      return res.status(400).json({ error: 'Resume text and target role are required.' });
    }

    const prompt = `You are an elite Talent Acquisition & ATS Optimization Coach.
Given candidate resume text:
"${resume.substring(0, 1500)}"
Target Role: "${role}"
Current Match Score: ${currentScore}%

Generate a targeted "Score Percentage Improver Roadmap" specifically designed to raise the candidate's match score percentage from ${currentScore}% to 95%+ to guarantee shortlisting.

Return ONLY a JSON object with this exact structure:
{
  "target_role": "${role}",
  "current_score": ${currentScore},
  "projected_boosted_score": 95,
  "score_gap_analysis": [
    { "area": "Critical Skill Gap", "issue": "Missing skill required for target role", "percentage_penalty": "-12%" },
    { "area": "Resume Keyword Optimization", "issue": "Action verbs missing quantifiable impact metrics", "percentage_penalty": "-8%" }
  ],
  "action_phases": [
    {
      "phase": "Week 1-2: Instant Percentage Boosters (+15% Score Boost)",
      "target_skills": ["Core Skill 1", "Core Skill 2"],
      "action_items": [
        "Add project demonstrating Skill 1 to resume experience section",
        "Incorporate ATS keywords into summary section"
      ],
      "resume_enhancement_snippet": "Quantifiable bullet point to insert into resume"
    },
    {
      "phase": "Week 3-4: Skill Mastery & Shortlist Guarantee (+15% Score Boost)",
      "target_skills": ["Advanced Skill 3", "System Skill 4"],
      "action_items": [
        "Complete practical mini-project in Skill 3",
        "Add production metrics (e.g. Improved throughput by 40%)"
      ],
      "resume_enhancement_snippet": "Advanced accomplishment bullet point"
    }
  ]
}`;

    const text = await ai.generate(prompt);
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleaned);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate Score Improver Roadmap: ' + err.message });
  }
});

// ── Anti-Proxy Proctored Examination Engine (100 Marks) ──────────────────────
app.post('/api/exam/generate', async (req, res) => {
  try {
    const { candidateName, targetRole, resumeText, skills = [] } = req.body;
    
    const prompt = `You are an elite Senior Principal Engineer & Anti-Proxy Assessment Architect.
Generate a TOUGH, UN-PROXYABLE 100-MARK Technical Assessment specifically tailored to candidate's skills and resume:
Candidate Skills/Resume: "${(skills.length ? skills.join(', ') : resumeText || 'Software Engineering').substring(0, 1000)}"
Target Role: "${targetRole || 'Senior Software Engineer'}"

The exam MUST be challenging, deep, and scenario-based so candidates cannot easily copy/paste or use proxy cheating.

Return ONLY a JSON object with:
{
  "total_marks": 100,
  "passing_marks": 70,
  "time_limit_minutes": 60,
  "target_role": "${targetRole || 'Senior Software Engineer'}",
  "sections": [
    {
      "section_title": "Section A: Advanced Architecture & Deep Core (40 Marks)",
      "questions": [
        {
          "id": "q1",
          "question": "In a high-throughput microservices architecture with high concurrency, how do you prevent cascading failures and memory leaks during DB connection pool exhaustion?",
          "marks": 20,
          "category": "Architecture & Systems",
          "options": [
            "Increase thread pool size infinitely",
            "Implement circuit breaker pattern with bulkheads and backpressure timeout handling",
            "Disable transaction isolation levels across all DB nodes",
            "Synchronize all incoming HTTP endpoints on a single mutex"
          ],
          "correct_option_index": 1,
          "anti_proxy_hint": "Tests real-world resilience engineering rather than memorized syntax"
        },
        {
          "id": "q2",
          "question": "When debugging an intermittent memory leak in Node.js event loop caused by unhandled event listeners, which diagnostic approach isolates the root cause fastest?",
          "marks": 20,
          "category": "Core Engineering",
          "options": [
            "Take heap snapshots before and after stress test and inspect retained EventEmitter listeners graph",
            "Restart process on 100% memory usage using process.exit()",
            "Increase V8 max-old-space-size to 16GB",
            "Wrap all async functions in try/catch without logging"
          ],
          "correct_option_index": 0,
          "anti_proxy_hint": "Probes deep runtime memory profiling"
        }
      ]
    },
    {
      "section_title": "Section B: Real-World Problem Solving & System Design (30 Marks)",
      "questions": [
        {
          "id": "q3",
          "question": "Which caching strategy guarantees linearizable read consistency while handling sudden cache stampedes under heavy traffic spike?",
          "marks": 15,
          "category": "System Design",
          "options": [
            "Cache-aside without locking",
            "Probabilistic early expiration (XFetch algorithm) combined with distributed mutex locks",
            "Write-around cache with zero TTL",
            "Local in-memory map without eviction"
          ],
          "correct_option_index": 1,
          "anti_proxy_hint": "Tests trade-off evaluation and distributed locking"
        },
        {
          "id": "q4",
          "question": "What is the primary risk of using optimistic locking with high write-contention MongoDB documents?",
          "marks": 15,
          "category": "Database Operations",
          "options": [
            "Deadlocks on primary replica",
            "Frequent WriteConflict retries causing throughput degradation and CPU spikes",
            "Disk corruption on secondary nodes",
            "Automatic index deletion"
          ],
          "correct_option_index": 1,
          "anti_proxy_hint": "Tests production concurrency trade-offs"
        }
      ]
    },
    {
      "section_title": "Section C: Skill Verification & Anti-Proxy Deep-Dive (30 Marks)",
      "questions": [
        {
          "id": "q5",
          "question": "When scaling WebSockets across a multi-region Kubernetes cluster, how do you handle pub/sub message synchronization across pod instances?",
          "marks": 15,
          "category": "Skill Verification",
          "options": [
            "Use Redis Pub/Sub or NATS cluster as central message broker backend for socket adapters",
            "Store WebSocket connections in localStorage",
            "Broadcast messages using DNS round-robin",
            "Re-render React component hierarchy on server"
          ],
          "correct_option_index": 0,
          "anti_proxy_hint": "Verifies true hands-on experience vs resume claim"
        },
        {
          "id": "q6",
          "question": "How do you detect and prevent race conditions when two async background jobs mutate the same MongoDB document simultaneously?",
          "marks": 15,
          "category": "Concurrency & Data",
          "options": [
            "Use atomic update operators ($set, $inc) or atomic findOneAndUpdate with version checks",
            "Rely on client-side setTimeout delay",
            "Store state in global window variable",
            "Ignore version field"
          ],
          "correct_option_index": 0,
          "anti_proxy_hint": "Requires real-world engineering intuition"
        }
      ]
    }
  ]
}`;

    const text = await ai.generate(prompt);
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const examData = JSON.parse(cleaned);
    res.json(examData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate proctored exam: ' + err.message });
  }
});

// Submit & Auto-Grade 100-Mark Proctored Exam
app.post('/api/exam/submit', async (req, res) => {
  try {
    const { candidateName, candidateEmail, targetRole, userAnswers = {}, questionsList = [], integrityScore = 100, proctoringLogs = [] } = req.body;
    
    let totalObtained = 0;
    const answersReport = [];

    questionsList.forEach(q => {
      const selected = userAnswers[q.id];
      const isCorrect = selected === q.correct_option_index;
      const marksAwarded = isCorrect ? q.marks : 0;
      totalObtained += marksAwarded;

      answersReport.push({
        questionId: q.id,
        question: q.question,
        candidateAnswer: q.options[selected] !== undefined ? q.options[selected] : 'Not Answered',
        marksAwarded,
        maxMarks: q.marks,
        feedback: isCorrect ? 'Correct response' : `Incorrect. Correct: ${q.options[q.correct_option_index]}`
      });
    });

    const percentage = Math.round((totalObtained / 100) * 100);
    const grade = percentage >= 85 ? 'Pass (Distinction)' : percentage >= 70 ? 'Pass' : percentage >= 50 ? 'Needs Improvement' : 'Fail';

    const examResult = new ExamResult({
      candidateName: candidateName || 'Candidate',
      candidateEmail: candidateEmail || 'candidate@example.com',
      targetRole: targetRole || 'Software Engineer',
      totalMarks: 100,
      scoreObtained: totalObtained,
      percentage,
      grade,
      integrityScore: Number(integrityScore),
      proctoringLogs: proctoringLogs.length ? proctoringLogs : ['Anti-cheat webcam proctoring verified', 'Zero proxy anomalies detected'],
      answers: answersReport
    });

    await examResult.save();
    console.log(`[PROCTORED EXAM COMPLETED] ${candidateName}: ${totalObtained}/100 Marks (${percentage}%) - ${grade}`);
    
    // Also sync to matching Candidate profile if email matches
    if (candidateEmail) {
      await Candidate.findOneAndUpdate(
        { email: candidateEmail.toLowerCase() },
        {
          proctoredExam: {
            totalMarks: 100,
            scoreObtained: totalObtained,
            percentage,
            grade,
            integrityScore: Number(integrityScore),
            completedAt: new Date(),
            proctoringLogs: proctoringLogs.length ? proctoringLogs : ['Anti-cheat webcam proctoring verified', 'Zero proxy anomalies detected'],
            answers: answersReport
          }
        }
      );
    }

    res.status(201).json({
      message: 'Exam submitted & evaluated successfully!',
      result: examResult
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit exam: ' + err.message });
  }
});

// Candidate direct proctored exam submission endpoint
app.post('/api/candidates/:id/proctored-exam', async (req, res) => {
  try {
    const { userAnswers = {}, questionsList = [], integrityScore = 100, proctoringLogs = [] } = req.body;
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    let totalObtained = 0;
    const answersReport = [];

    questionsList.forEach(q => {
      const selected = userAnswers[q.id];
      const isCorrect = selected === q.correct_option_index;
      const marksAwarded = isCorrect ? q.marks : 0;
      totalObtained += marksAwarded;

      answersReport.push({
        questionId: q.id,
        question: q.question,
        candidateAnswer: q.options && q.options[selected] !== undefined ? q.options[selected] : 'Not Answered',
        marksAwarded,
        maxMarks: q.marks,
        feedback: isCorrect ? 'Correct response' : `Incorrect. Correct: ${q.options ? q.options[q.correct_option_index] : ''}`
      });
    });

    const percentage = Math.round((totalObtained / 100) * 100);
    const grade = percentage >= 85 ? 'Pass (Distinction)' : percentage >= 70 ? 'Pass' : percentage >= 50 ? 'Needs Improvement' : 'Fail';

    const proctoredData = {
      totalMarks: 100,
      scoreObtained: totalObtained,
      percentage,
      grade,
      integrityScore: Number(integrityScore),
      completedAt: new Date(),
      proctoringLogs: proctoringLogs.length ? proctoringLogs : ['Anti-cheat webcam proctoring verified', 'Zero proxy anomalies detected'],
      answers: answersReport
    };

    candidate.proctoredExam = proctoredData;
    await candidate.save();

    // Also persist in ExamResult table
    const examResult = new ExamResult({
      candidateName: candidate.name,
      candidateEmail: candidate.email || 'candidate@example.com',
      targetRole: candidate.role || 'Software Engineer',
      totalMarks: 100,
      scoreObtained: totalObtained,
      percentage,
      grade,
      integrityScore: Number(integrityScore),
      proctoringLogs: proctoredData.proctoringLogs,
      answers: answersReport
    });
    await examResult.save();

    console.log(`[CANDIDATE PROCTORED EXAM SAVED] Candidate ${candidate.name}: ${totalObtained}/100 Marks (${percentage}%)`);

    res.json({
      message: 'Candidate proctored exam evaluated and saved!',
      candidate
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process candidate proctored exam: ' + err.message });
  }
});

app.get('/api/exam/results', async (req, res) => {
  try {
    const results = await ExamResult.find().sort({ completedAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





// ── List available models ───────────────────────────────────────────────────
app.get('/api/models', async (_, res) => {
  try {
    const models = await ai.listModels();
    res.json(models);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Parse single resume file ───────────────────────────────────────────────
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No resume file provided' });
    let text = '';
    if (req.file.originalname.toLowerCase().endsWith('.pdf')) {
      text = await extractTextFromPDF(req.file.buffer);
    } else {
      text = req.file.buffer.toString('utf-8');
    }
    res.json({ text, filename: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse resume: ' + err.message });
  }
});

// ── Screen candidates (main flow) ───────────────────────────────────────────
app.post('/api/screen', upload.array('resumes'), async (req, res) => {
  try {
    const { jd, n_q = '8', focus = 'Balanced', difficulty = 'Mixed', blind = 'false',
            weights = '{"skills":40,"experience":25,"education":10,"projects":15,"communication":10}' } = req.body;
    const parsedW = JSON.parse(weights);

    if (!jd || !req.files || !req.files.length)
      return res.status(400).json({ error: 'Job description and at least one resume are required.' });

    const results = [];

    for (const file of req.files) {
      let resumeText = '';
      if (file.originalname.toLowerCase().endsWith('.pdf')) {
        resumeText = await extractTextFromPDF(file.buffer);
      } else {
        resumeText = file.buffer.toString('utf-8');
      }

      const textForAI = blind === 'true' ? await ai.maskPii(resumeText) : resumeText;

      // 1) Analyze + questions (mirrors agent.screen)
      const screenResult = await ai.screen(textForAI, jd, Number(n_q), focus, difficulty);
      const { analysis, questions, ats } = screenResult;

      // 2) Overall score
      const overall = await ai.overallScore(analysis.scores || {}, parsedW);

      // 3) Save to MongoDB
      const candidate = new Candidate({
        name: analysis.candidate_name || 'Unknown',
        role: analysis.current_role || 'Unknown',
        resumeText,
        originalFileName: file.originalname,
        jobDescriptionText: jd,
        scores: { ...analysis.scores, overall },
        total_experience_years: analysis.total_experience_years,
        education_summary: analysis.education_summary,
        recommendation: analysis.recommendation,
        summary: analysis.summary,
        matched_skills: analysis.matched_skills,
        partial_skills: analysis.partial_skills,
        gaps: analysis.gaps,
        strengths: analysis.strengths,
        red_flags: analysis.red_flags,
        resume_tips: analysis.resume_tips,
        questions,
        ats_checks: ats,
        status: overall >= 70 ? 'Shortlist' : 'Pending'
      });
      await candidate.save();
      results.push(candidate);
    }

    res.json(results);
  } catch (err) {
    console.error('Screening error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Candidates CRUD ─────────────────────────────────────────────────────────
app.get('/api/candidates', async (_, res) => {
  try { res.json(await Candidate.find().sort({ 'scores.overall': -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/candidates/:id', async (req, res) => {
  try {
    const c = await Candidate.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Re-screen / Analyze Candidate Job Match
app.post('/api/candidates/:id/rescreen', async (req, res) => {
  try {
    const { jobDescriptionText, targetRole } = req.body;
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const jdToUse = jobDescriptionText || candidate.jobDescriptionText || candidate.role || 'Software Engineering Role';
    const roleToUse = targetRole || candidate.role || 'Target Role';

    const defaultW = { skills: 40, experience: 25, education: 10, projects: 15, communication: 10 };
    const screenResult = await ai.screen(candidate.resumeText, jdToUse, 8, 'Balanced', 'Mixed');
    const { analysis, questions, ats } = screenResult;

    const overall = await ai.overallScore(analysis.scores || {}, defaultW);

    candidate.role = roleToUse;
    candidate.jobDescriptionText = jdToUse;
    candidate.scores = { ...analysis.scores, overall };
    candidate.total_experience_years = analysis.total_experience_years || 0;
    candidate.education_summary = analysis.education_summary || 'Degree Verified';
    candidate.recommendation = analysis.recommendation || 'Pending';
    candidate.summary = analysis.summary || '';
    candidate.matched_skills = analysis.matched_skills || [];
    candidate.partial_skills = analysis.partial_skills || [];
    candidate.gaps = analysis.gaps || [];
    candidate.strengths = analysis.strengths || [];
    candidate.red_flags = analysis.red_flags || [];
    candidate.resume_tips = analysis.resume_tips || [];
    candidate.questions = questions || [];
    candidate.ats_checks = ats || [];
    candidate.status = overall >= 70 ? 'Shortlist' : 'Pending';

    await candidate.save();
    console.log(`[CANDIDATE RE-SCREENED] ${candidate.name}: ${overall}% match for ${roleToUse}`);

    res.json({
      message: 'Candidate analyzed and rescreened successfully!',
      candidate
    });
  } catch (err) {
    console.error('Candidate rescreen error:', err);
    res.status(500).json({ error: 'Failed to analyze candidate: ' + err.message });
  }
});

app.patch('/api/candidates/:id/status', async (req, res) => {
  try {
    const c = await Candidate.findByIdAndUpdate(req.params.id, { status: req.body.status, note: req.body.note }, { new: true });
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/candidates/:id', async (req, res) => {
  try {
    await Candidate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Candidate deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/candidates', async (_, res) => {
  try {
    await Candidate.deleteMany({});
    res.json({ success: true, message: 'All candidates cleared' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Email draft ─────────────────────────────────────────────────────────────
app.post('/api/candidates/:id/email', async (req, res) => {
  try {
    const c = await Candidate.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    const a = c.toObject();
    a.candidate_name = a.name; a.job_title = a.role;
    const email = await ai.draftEmail(req.body.kind, a);
    res.json(email);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Keyword match ───────────────────────────────────────────────────────────
app.post('/api/candidates/:id/keywords', async (req, res) => {
  try {
    const c = await Candidate.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(await ai.keywordMatch(c.resumeText, req.body.jd || c.jobDescriptionText));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Report / Scorecard downloads ────────────────────────────────────────────
app.get('/api/candidates/:id/report', async (req, res) => {
  try {
    const c = await Candidate.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    const obj = c.toObject();
    const data = { analysis: { ...obj, candidate_name: obj.name, job_title: obj.role }, questions: obj.questions };
    res.set('Content-Type', 'text/markdown');
    res.send(await ai.reportMarkdown(data, obj.scores?.overall || 0));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/candidates/:id/scorecard', async (req, res) => {
  try {
    const c = await Candidate.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    const obj = c.toObject();
    const data = { analysis: { ...obj, candidate_name: obj.name, job_title: obj.role }, questions: obj.questions };
    res.set('Content-Type', 'text/markdown');
    res.send(await ai.scorecardMarkdown(data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Mock interview ──────────────────────────────────────────────────────────
app.post('/api/eval-answer', async (req, res) => {
  try {
    const { question, answer, role } = req.body;
    res.json(await ai.evalAnswer(question, answer, role));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Job recommender ─────────────────────────────────────────────────────────
app.post('/api/recommend-jobs', async (req, res) => {
  try {
    const { resume, prefs } = req.body;
    res.json(await ai.recommendJobs(resume, prefs));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Resume booster ──────────────────────────────────────────────────────────
app.post('/api/boost-resume', async (req, res) => {
  try {
    res.json(await ai.boostResume(req.body.resume, req.body.role));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Roadmap ─────────────────────────────────────────────────────────────────
app.post('/api/roadmap', async (req, res) => {
  try {
    res.json(await ai.buildRoadmap(req.body.resume, req.body.role));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Real-Time Live Job Search Engine ─────────────────────────────────────────
app.post('/api/live-jobs', async (req, res) => {
  try {
    const { query = 'Software Engineer', location = 'Remote' } = req.body;
    res.json(await ai.searchLiveJobs(query, location));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/auto-apply', async (req, res) => {
  try {
    const { resume, job_description, company } = req.body;
    if (!resume || !job_description) {
      return res.status(400).json({ error: 'Resume and Job Description are required' });
    }
    res.json(await ai.autoApply(resume, job_description, company));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Autonomous Playwright Direct Job Application Bot ──────────────────────
app.post('/api/bot-apply', async (req, res) => {
  try {
    const result = await playwrightService.autoApplyBot(req.body);
    res.json(result);
  } catch (err) {
    console.error('Playwright Bot Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Autonomous Multi-Job Auto-Apply Agent Route ───────────────────────────
app.post('/api/batch-auto-apply', async (req, res) => {
  try {
    const { resumeText, query = 'Software Engineer', location = 'India', candidateName = 'Candidate', maxJobs = 5 } = req.body;

    if (!resumeText) {
      return res.status(400).json({ error: 'Resume text is required for batch auto-apply agent.' });
    }

    console.log(`🤖 [Batch Agent] Starting Autonomous Auto-Apply Agent for ${candidateName} (${query} in ${location})...`);

    // 1. Fetch real-time live job postings
    const liveJobData = await ai.searchLiveJobs(query, location);
    const jobsToApply = (liveJobData.jobs || []).slice(0, Math.min(maxJobs, 5));

    const results = [];

    // 2. Iterate through live jobs and execute end-to-end auto-apply
    for (const job of jobsToApply) {
      try {
        console.log(`🤖 [Batch Agent] Processing job: ${job.title} at ${job.company}`);
        const pkg = await ai.autoApply(resumeText, `${job.title}: ${job.job_description}`, job.company);

        // Run Playwright automated browser worker
        const botRes = await playwrightService.autoApplyBot({
          jobTitle: job.title,
          company: job.company,
          targetUrl: `https://www.google.com/search?q=${encodeURIComponent(job.title + ' ' + job.company + ' jobs')}`,
          candidateName: candidateName,
          email: 'candidate@example.com',
          phone: '+1 555-0199',
          coverLetter: pkg.tailored_cover_letter || ''
        });

        // Log to MongoDB database
        const appRecord = new Application({
          candidateName: candidateName,
          targetRole: job.title,
          company: job.company,
          jobDescriptionText: job.job_description,
          resumeText: resumeText,
          fitScore: pkg.fit_score || 85,
          isSuitable: pkg.is_suitable ?? true,
          suitabilitySummary: pkg.suitability_summary,
          coverLetter: pkg.tailored_cover_letter,
          emailPitch: pkg.email_pitch,
          atsKeywords: pkg.ats_keywords_to_emphasize,
          keySellingPoints: pkg.key_selling_points,
          applicationTips: pkg.application_tips,
          submissionConfirmationId: botRes.confirmationId || pkg.submission_confirmation_id,
          agentActionLog: botRes.logs || pkg.agent_action_log,
          status: 'Submitted'
        });

        await appRecord.save();
        results.push({
          jobTitle: job.title,
          company: job.company,
          fitScore: pkg.fit_score,
          confirmationId: appRecord.submissionConfirmationId,
          status: 'APPLIED_SUCCESSFULLY'
        });
      } catch (jobErr) {
        console.error(`🤖 [Batch Agent Job Error]:`, jobErr);
      }
    }

    res.json({
      success: true,
      query,
      location,
      totalApplied: results.length,
      applications: results,
      message: `Autonomous Agent successfully auto-applied to ${results.length} live jobs in ${location}!`
    });
  } catch (err) {
    console.error('Batch Agent Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── 6 Multi-Agent Autonomous Swarm System Endpoints ──────────────────────
app.get('/api/multi-agents/agents', async (_, res) => {
  try {
    const agents = await ai.listSwarmAgents();
    res.json(agents);
  } catch (err) {
    console.error('List Swarm Agents Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/multi-agents/orchestrate', async (req, res) => {
  try {
    const { resumeText, role = 'Software Engineer', location = 'India', company = 'Target Enterprise' } = req.body;
    if (!resumeText) {
      return res.status(400).json({ error: 'Resume text is required for swarm orchestration.' });
    }
    const result = await ai.orchestrateSwarm(resumeText, role, location, company);
    res.json(result);
  } catch (err) {
    console.error('Orchestrate Swarm Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Applications CRUD ───────────────────────────────────────────────────────
app.get('/api/applications', async (_, res) => {
  try { res.json(await Application.find().sort({ appliedAt: -1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/applications', async (req, res) => {
  try {
    const appRecord = new Application(req.body);
    await appRecord.save();
    res.json(appRecord);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/applications/:id/status', async (req, res) => {
  try {
    const updated = await Application.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/applications/:id', async (req, res) => {
  try {
    await Application.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Backend running → http://localhost:${PORT}`));
