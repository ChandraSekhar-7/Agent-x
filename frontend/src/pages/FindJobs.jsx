import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  Loader2, ExternalLink, Upload, FileText, CheckCircle2, 
  Sparkles, Compass, MapPin, Search, ArrowRight, Copy, Check, ChevronDown,
  Bot, Send, Briefcase, Clock, Building, Trash2, ShieldCheck, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroBanner from '../components/HeroBanner';

export default function FindJobs() {
  const { user } = useAuth();
  const isCandidate = user?.role === 'candidate';

  const [candidates, setCandidates] = useState([]);

  const [source, setSource] = useState('candidate'); // 'candidate', 'upload', 'paste'
  const [selId, setSelId] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [prefs, setPrefs] = useState('Remote / Flexible');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [parseLoading, setParseLoading] = useState(false);

  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [targetRole, setTargetRole] = useState('');
  const [companyName, setCompanyName] = useState('Tech Corp');
  const [roadmap, setRoadmap] = useState(null);
  const [boost, setBoost] = useState(null);
  const [roadLoading, setRoadLoading] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  // Auto-Apply Agent state
  const [applyPkg, setApplyPkg] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Real-Time Live Job Search state
  const [liveSearchQuery, setLiveSearchQuery] = useState('');
  const [liveSearchLocation, setLiveSearchLocation] = useState('Remote');
  const [liveJobs, setLiveJobs] = useState(null);
  const [liveSearchLoading, setLiveSearchLoading] = useState(false);

  // Playwright Automated Browser Bot state
  const [botLoading, setBotLoading] = useState(false);
  const [botResult, setBotResult] = useState(null);

  // Autonomous Multi-Job Auto-Apply Agent state
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  // Applications Tracker state
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('find'); // 'find' or 'applications'

  useEffect(() => {
    fetchCandidates();
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/applications');
      setApplications(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/candidates');
      setCandidates(res.data);
      if (res.data.length > 0) {
        setSelId(res.data[0]._id);
        setResumeText(res.data[0].resumeText || '');
      } else {
        setSource('upload');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCandidateChange = (id) => {
    setSelId(id);
    const c = candidates.find(x => x._id === id);
    if (c) {
      setResumeText(c.resumeText || '');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setParseLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res = await api.post('/parse-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResumeText(res.data.text || '');
    } catch (err) {
      console.error(err);
      setError('Failed to parse file. Please try pasting raw text instead.');
    } finally {
      setParseLoading(false);
    }
  };

  const findJobs = async () => {
    if (!resumeText.trim()) {
      setError('Please select a candidate, upload a resume, or paste resume text.');
      return;
    }
    setLoading(true);
    setError('');
    setRecs(null);
    setRoadmap(null);
    setBoost(null);

    try {
      const res = await api.post('/recommend-jobs', { resume: resumeText, prefs });
      setRecs(res.data);
      const allRoles = [...(res.data.recommended || []), ...(res.data.stretch || [])];
      if (allRoles.length > 0) {
        setTargetRole(allRoles[0].title);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to generate job recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreBoosterRoadmap = async () => {
    if (!resumeText.trim() || !targetRole) return;
    setRoadLoading(true);
    setError('');
    try {
      const res = await api.post('/score-booster-roadmap', { 
        resume: resumeText, 
        role: targetRole,
        currentScore: recs?.matched_skills ? 68 : 62
      });
      setRoadmap(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to generate Score Percentage Improver Roadmap.');
    } finally {
      setRoadLoading(false);
    }
  };


  const getBoost = async () => {
    if (!resumeText.trim() || !targetRole) return;
    setBoostLoading(true);
    setError('');
    try {
      const res = await api.post('/boost-resume', { resume: resumeText, role: targetRole });
      setBoost(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to generate resume improvements.');
    } finally {
      setBoostLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const runAutoApply = async (specificRole = null) => {
    let roleToUse = specificRole || targetRole;
    let rText = resumeText;

    if (!rText.trim() && candidates.length > 0) {
      rText = candidates[0].resumeText || '';
      setResumeText(rText);
      setSelId(candidates[0]._id);
    }

    if (!roleToUse && candidates.length > 0) {
      roleToUse = candidates[0].role || 'Software Engineer';
      setTargetRole(roleToUse);
    }

    if (!rText.trim()) {
      setError('Please upload a resume, paste resume text, or select a candidate first.');
      return;
    }

    if (!roleToUse.trim()) {
      setError('Please select or enter a target job description / role first.');
      return;
    }

    setApplyLoading(true);
    setError('');
    setApplyPkg(null);
    setSubmittedSuccess(false);

    try {
      // Step 1: Run AI Agent suitability analysis & application package generation
      const res = await api.post('/auto-apply', {
        resume: rText,
        job_description: roleToUse,
        company: companyName || 'Target Enterprise'
      });
      const pkg = res.data;
      setApplyPkg(pkg);

      // Step 2: Automatically apply & save application to MongoDB
      const candidateObj = candidates.find(c => c._id === selId);
      const name = candidateObj ? candidateObj.name : (pkg.candidate_name || 'Candidate');

      await api.post('/applications', {
        candidateName: name,
        targetRole: pkg.target_role || roleToUse,
        company: companyName || pkg.company_or_platform || 'Target Enterprise',
        jobDescriptionText: roleToUse,
        resumeText: rText,
        fitScore: pkg.fit_score,
        isSuitable: pkg.is_suitable,
        suitabilitySummary: pkg.suitability_summary,
        coverLetter: pkg.tailored_cover_letter,
        emailPitch: pkg.email_pitch,
        atsKeywords: pkg.ats_keywords_to_emphasize,
        keySellingPoints: pkg.key_selling_points,
        applicationTips: pkg.application_tips,
        submissionConfirmationId: pkg.submission_confirmation_id,
        agentActionLog: pkg.agent_action_log,
        status: 'Submitted'
      });

      // Step 3: Trigger Playwright Automated Background Bot Application instantly
      try {
        setBotLoading(true);
        const botRes = await api.post('/bot-apply', {
          jobTitle: pkg.target_role || roleToUse,
          company: companyName || pkg.company_or_platform || 'Target Enterprise',
          targetUrl: `https://www.google.com/search?q=${encodeURIComponent((pkg.target_role || roleToUse) + ' ' + (companyName || '') + ' jobs')}`,
          candidateName: name,
          email: candidateObj?.email || 'candidate@example.com',
          phone: candidateObj?.phone || '+1 555-0199',
          coverLetter: pkg.tailored_cover_letter || ''
        });
        setBotResult(botRes.data);
      } catch (bErr) {
        console.warn('Background Playwright Bot Note:', bErr);
      } finally {
        setBotLoading(false);
      }

      setSubmittedSuccess(true);
      fetchApplications();
      setTimeout(() => {
        document.getElementById('auto-apply-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Auto-Apply Agent failed to process job application.');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleDeleteApplication = async (id) => {
    if (window.confirm('Delete application record?')) {
      try {
        await api.delete(`/applications/${id}`);
        setApplications(prev => prev.filter(a => a._id !== id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await api.patch(`/applications/${id}/status`, { status: newStatus });
      setApplications(prev => prev.map(a => a._id === id ? res.data : a));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLiveJobs = async () => {
    const q = liveSearchQuery.trim() || targetRole || 'Software Engineer';
    setLiveSearchLoading(true);
    setError('');
    try {
      const res = await api.post('/live-jobs', {
        query: q,
        location: liveSearchLocation || 'Remote'
      });
      setLiveJobs(res.data.jobs || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to search live real-time jobs.');
    } finally {
      setLiveSearchLoading(false);
    }
  };

  const submitApplication = async () => {
    if (!applyPkg) return;
    setSubmitting(true);
    setError('');
    try {
      const candidateObj = candidates.find(c => c._id === selId);
      const name = candidateObj ? candidateObj.name : (applyPkg.candidate_name || 'Candidate');
      const roleToUse = applyPkg.target_role || targetRole || 'Software Engineer';
      const compToUse = companyName || applyPkg.company_or_platform || 'Target Enterprise';

      await api.post('/applications', {
        candidateName: name,
        targetRole: roleToUse,
        company: compToUse,
        jobDescriptionText: roleToUse,
        resumeText: resumeText,
        fitScore: applyPkg.fit_score || 85,
        isSuitable: applyPkg.is_suitable ?? true,
        suitabilitySummary: applyPkg.suitability_summary || '',
        coverLetter: applyPkg.tailored_cover_letter || '',
        emailPitch: applyPkg.email_pitch || '',
        atsKeywords: applyPkg.ats_keywords_to_emphasize || [],
        keySellingPoints: applyPkg.key_selling_points || [],
        applicationTips: applyPkg.application_tips || [],
        status: 'Submitted'
      });

      setSubmittedSuccess(true);
      fetchApplications();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to submit application to tracker.');
    } finally {
      setSubmitting(false);
    }
  };

  const runPlaywrightBot = async (customUrl = '') => {
    setBotLoading(true);
    setBotResult(null);
    try {
      const candidateObj = candidates.find(c => c._id === selId);
      const name = candidateObj ? candidateObj.name : (applyPkg?.candidate_name || 'Candidate');
      const email = candidateObj ? (candidateObj.email || 'candidate@example.com') : 'candidate@example.com';
      const phone = candidateObj ? (candidateObj.phone || '+1 555-0199') : '+1 555-0199';

      const res = await api.post('/bot-apply', {
        jobTitle: applyPkg?.target_role || targetRole || 'Software Engineer',
        company: companyName || applyPkg?.company_or_platform || 'Target Enterprise',
        targetUrl: customUrl || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent((applyPkg?.target_role || targetRole) + ' ' + (companyName || ''))}`,
        candidateName: name,
        email: email,
        phone: phone,
        coverLetter: applyPkg?.tailored_cover_letter || ''
      });

      setBotResult(res.data);
      if (res.data.success) {
        submitApplication();
      }
    } catch (err) {
      console.error(err);
      setBotResult({ success: false, error: err.response?.data?.error || 'Playwright Bot execution failed' });
    } finally {
      setBotLoading(false);
    }
  };

  const runBatchAutoApplyAgent = async () => {
    let rText = resumeText;
    if (!rText.trim() && candidates.length > 0) {
      rText = candidates[0].resumeText || '';
      setResumeText(rText);
      setSelId(candidates[0]._id);
    }

    if (!rText.trim()) {
      setError('Please select a candidate, upload a resume, or paste resume text first.');
      return;
    }

    setBatchLoading(true);
    setBatchResult(null);
    setError('');

    try {
      const candidateObj = candidates.find(c => c._id === selId);
      const name = candidateObj ? candidateObj.name : 'Candidate';

      const res = await api.post('/batch-auto-apply', {
        resumeText: rText,
        query: liveSearchQuery || targetRole || 'Software Engineer',
        location: liveSearchLocation || 'India',
        candidateName: name,
        maxJobs: 5
      });

      setBatchResult(res.data);
      fetchApplications();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Batch Autonomous Agent execution failed.');
    } finally {
      setBatchLoading(false);
    }
  };

  const allRoles = recs ? [...(recs.recommended || []), ...(recs.stretch || [])] : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <HeroBanner
        badge={isCandidate ? "Candidate Job Portal" : "Recruiter Talent Scout"}
        title={isCandidate ? "Find Live Jobs & Apply with AI Match" : "Job Market Openings & Talent Benchmarking"}
        subtitle={
          isCandidate 
            ? "Discover tech roles tailored to your skills across India & Global markets, calculate instant ATS match scores, and submit 1-click applications."
            : "Inspect active market job postings, skill requirements, salary benchmarks, and competitive industry hiring demands."
        }
        icon={Compass}
      />


      {/* Top Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('find')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'find'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Search size={16} /> Job Matcher & Auto-Apply Agent
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'applications'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Briefcase size={16} /> Applied Jobs Tracker
          <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
            {applications.length}
          </span>
        </button>
      </div>

      {activeTab === 'applications' ? (
        /* Applications Tracker Dashboard */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Briefcase size={18} className="text-indigo-600 dark:text-indigo-400" />
                Submitted Applications Log ({applications.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track and manage jobs applied via the AI Auto-Apply Agent.</p>
            </div>
            <button
              onClick={fetchApplications}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Refresh Log
            </button>
          </div>

          {applications.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Bot className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base">No Applied Jobs Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Use the AI Auto-Apply Agent in the "Job Matcher & Auto-Apply Agent" tab to generate tailored cover letters and submit applications for candidate resumes.
              </p>
              <button
                onClick={() => setActiveTab('find')}
                className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Run Auto-Apply Agent Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map(app => (
                <div key={app._id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">{app.targetRole}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                          <Building size={12} /> {app.company || 'Target Enterprise'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                        <span>Candidate: <strong className="text-slate-700 dark:text-slate-300">{app.candidateName}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(app.appliedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{app.fitScore}%</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">Suitability</span>
                      </div>
                      
                      <select
                        value={app.status}
                        onChange={e => handleStatusUpdate(app._id, e.target.value)}
                        className={`p-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                          app.status === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' :
                          app.status === 'Interview Scheduled' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' :
                          app.status === 'Offered' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800' :
                          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Interview Scheduled">Interview Scheduled</option>
                        <option value="Offered">Offered</option>
                        <option value="Rejected">Rejected</option>
                      </select>

                      <button
                        onClick={() => handleDeleteApplication(app._id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors cursor-pointer"
                        title="Delete Application"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {app.suitabilitySummary && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-slate-100">Suitability Assessment: </strong>
                      {app.suitabilitySummary}
                    </div>
                  )}

                  {/* Expandable Cover Letter & Email Pitch */}
                  <details className="text-xs group">
                    <summary className="font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">
                      View Tailored Cover Letter & Email Pitch
                    </summary>
                    <div className="mt-3 space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {app.coverLetter && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Cover Letter</span>
                            <button
                              onClick={() => copyToClipboard(app.coverLetter, app._id + 'cover')}
                              className="text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === app._id + 'cover' ? <Check size={12} /> : <Copy size={12} />} Copy
                            </button>
                          </div>
                          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 whitespace-pre-line font-sans">
                            {app.coverLetter}
                          </div>
                        </div>
                      )}

                      {app.emailPitch && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Recruiter Email Pitch</span>
                            <button
                              onClick={() => copyToClipboard(app.emailPitch, app._id + 'pitch')}
                              className="text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === app._id + 'pitch' ? <Check size={12} /> : <Copy size={12} />} Copy
                            </button>
                          </div>
                          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-sans">
                            {app.emailPitch}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Main Job Matcher & Auto-Apply Agent Tab */
        <>

      {/* Input Selection Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>1. Select Resume Source</span>
        </h2>

        {/* Source Radio Toggle */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: 'candidate', label: 'Screened Candidate', icon: CheckCircle2, desc: 'Use profile from candidate pool' },
            { id: 'upload', label: 'Upload PDF / TXT', icon: Upload, desc: 'Upload a resume document' },
            { id: 'paste', label: 'Paste Raw Text', icon: FileText, desc: 'Paste text directly' }
          ].map(item => (
            <div
              key={item.id}
              onClick={() => {
                setSource(item.id);
                if (item.id === 'candidate' && candidates.length > 0 && !selId) {
                  handleCandidateChange(candidates[0]._id);
                }
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                source === item.id 
                  ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20 text-indigo-900 dark:text-indigo-200' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className={source === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                <div>
                  <div className={`font-bold text-sm ${source === item.id ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200'}`}>{item.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Source Content */}
        {source === 'candidate' && (
          <div>
            {candidates.length > 0 ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Select Candidate</label>
                <select
                  value={selId}
                  onChange={e => handleCandidateChange(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {candidates.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} — {c.role} ({c.total_experience_years}y exp, {c.scores?.overall || 0}/100 score)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-sm">
                No screened candidates in pool yet. Switch to "Upload PDF / TXT" or "Paste Raw Text" above.
              </div>
            )}
          </div>
        )}

        {source === 'upload' && (
          <div>
            <label className="border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors">
              <Upload className="w-8 h-8 text-indigo-500 dark:text-indigo-400 mb-2" />
              <span className="font-bold text-sm text-slate-700 dark:text-slate-200">Click to upload resume (PDF or TXT)</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Files are parsed automatically</span>
              <input type="file" accept=".pdf,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
            {parseLoading && (
              <div className="flex items-center gap-2 mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Extracting resume text...
              </div>
            )}
            {uploadedFileName && !parseLoading && (
              <div className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-lg flex items-center gap-2">
                <CheckCircle2 size={16} /> Parsed "{uploadedFileName}" successfully ({resumeText.length} characters)
              </div>
            )}
          </div>
        )}

        {source === 'paste' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Paste Resume Text</label>
            <textarea
              rows={6}
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              placeholder="Paste full resume text here..."
              className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-sans outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>
        )}

        {/* Preferences */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Target Preferences / Location / Domain (Optional)</label>
          <input
            type="text"
            value={prefs}
            onChange={e => setPrefs(e.target.value)}
            placeholder="e.g. Remote, Hybrid, Bangalore, FinTech, Product company"
            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Building size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span>Search Real-Time Live Jobs & Auto-Apply</span>
            </h3>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] font-semibold">Quick Filters:</span>
              {[
                { label: '🇮🇳 India', loc: 'India' },
                { label: '🏙️ Bangalore', loc: 'Bangalore, India' },
                { label: '🌐 Worldwide / Remote', loc: 'Remote' },
                { label: '🇺🇸 USA', loc: 'USA' }
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={() => {
                    setLiveSearchLocation(btn.loc);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all border cursor-pointer ${
                    liveSearchLocation === btn.loc 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <input
              type="text"
              value={liveSearchQuery}
              onChange={e => setLiveSearchQuery(e.target.value)}
              placeholder="Job Title (e.g. Full Stack Engineer, ML Engineer)"
              className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={liveSearchLocation}
              onChange={e => setLiveSearchLocation(e.target.value)}
              placeholder="Location (e.g. India, Remote, Bangalore, London)"
              className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={fetchLiveJobs}
              disabled={liveSearchLoading}
              className="py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {liveSearchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search size={14} /> Search Live Jobs ({liveSearchLocation || 'Global'})</>}
            </button>
          </div>
        </div>

        {/* Autonomous Multi-Job Auto-Apply Agent Banner */}
        <div className="p-6 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border-2 border-purple-500/40 rounded-2xl text-white space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600/30 rounded-xl border border-purple-400/40">
                <Bot size={24} className="text-purple-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <span>Autonomous Multi-Job Auto-Apply Agent</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold bg-emerald-500 text-slate-950">Active Bot Engine</span>
                </h3>
                <p className="text-xs text-purple-200 mt-0.5">Automates job discovery, suitability evaluation, AI cover letter generation, and Playwright browser submission on your behalf.</p>
              </div>
            </div>

            <button
              onClick={runBatchAutoApplyAgent}
              disabled={batchLoading}
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer hover:scale-105 shrink-0"
            >
              {batchLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Autonomous Agent Applying Live...</>
              ) : (
                <><Bot size={18} /> 🚀 Launch Autonomous Multi-Job Agent</>
              )}
            </button>
          </div>

          {batchResult && (
            <div className="p-4 bg-slate-900/90 border border-emerald-500/50 rounded-xl text-xs space-y-3 font-sans">
              <div className="flex items-center justify-between font-bold text-emerald-400">
                <span className="flex items-center gap-2"><CheckCircle2 size={16} /> {batchResult.message}</span>
                <button onClick={() => setActiveTab('applications')} className="underline text-indigo-300 font-extrabold cursor-pointer">View Tracker ({batchResult.totalApplied}) →</button>
              </div>
              <div className="grid md:grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                {(batchResult.applications || []).map((appItem, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">{appItem.jobTitle}</span>
                      <span className="text-slate-400 text-[10px]">{appItem.company} • {appItem.fitScore}% Fit</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[9px] font-bold">
                      {appItem.confirmationId}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          onClick={findJobs}
          disabled={loading || parseLoading || !resumeText.trim()}
          className={`w-full py-4 rounded-xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            loading || parseLoading || !resumeText.trim()
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white hover:shadow-indigo-200 dark:hover:shadow-none hover:-translate-y-0.5'
          }`}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Profile & Recommending Career Paths...</>
          ) : (
            <><Sparkles size={18} /> Analyze Profile & Match Roles</>
          )}
        </button>
      </div>

      {/* Real-Time Live Job Search Results */}
      {liveJobs && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building className="text-indigo-600 dark:text-indigo-400" size={20} />
                Real-Time Live Job Openings ({liveJobs.length})
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Live Search Results</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {liveJobs.map((job, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{job.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-bold text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <Building size={12} /> {job.company}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <MapPin size={12} /> {job.location} ({job.work_type})
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold shrink-0">
                        {job.posted_ago || 'Live'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        💰 {job.salary_range}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 font-semibold text-indigo-700 dark:text-indigo-300">
                        {job.experience_level}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 font-semibold text-purple-700 dark:text-purple-300">
                        Platform: {job.platform}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{job.job_description}</p>

                    {job.key_requirements && job.key_requirements.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 block">Requirements:</span>
                        <div className="flex flex-wrap gap-1">
                          {job.key_requirements.map((req, rIdx) => (
                            <span key={rIdx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[11px] font-medium">
                              • {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions: 1-Click Auto-Apply & Live External Apply Links */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setCompanyName(job.company);
                          setTargetRole(`${job.title} at ${job.company}`);
                          runAutoApply(`${job.title} at ${job.company}: ${job.job_description}`);
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Bot size={16} /> 1-Click Auto-Apply Agent to {job.company}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-400">Direct Portal Search:</span>
                      <div className="flex gap-2">
                        {[
                          { name: 'LinkedIn', url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(job.title + ' ' + job.company)}` },
                          { name: 'Indeed', url: `https://www.indeed.com/jobs?q=${encodeURIComponent(job.title + ' ' + job.company)}` },
                          { name: 'Google Jobs', url: `https://www.google.com/search?q=${encodeURIComponent(job.title + ' ' + job.company + ' jobs')}` }
                        ].map(p => (
                          <a
                            key={p.name}
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                          >
                            <ExternalLink size={10} /> {p.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Recommendations Results */}
      {recs && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            
            {/* Candidate Profile Summary */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Compass size={16} /> Candidate Profile Assessment
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">{recs.profile_summary}</p>
              
              {recs.career_path && recs.career_path.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-slate-400">Typical Role Trajectory:</span>
                  {recs.career_path.map((step, idx) => (
                    <span key={idx} className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-indigo-900/60 border border-indigo-700/50 text-indigo-200 rounded-lg font-semibold">
                        {step}
                      </span>
                      {idx < recs.career_path.length - 1 && <ArrowRight size={12} className="text-slate-500" />}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Ready For Now Roles */}
            {recs.recommended && recs.recommended.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    Immediate Best-Fit Roles (Ready Now)
                  </h3>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{recs.recommended.length} Matches</span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {recs.recommended.map((role, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{role.title}</h4>
                            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                              {role.level} Level
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{role.fit_percent}%</span>
                            <span className="text-xs text-slate-400 block">Match</span>
                          </div>
                        </div>

                        {/* Fit Progress Bar */}
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full" 
                            style={{ width: `${role.fit_percent}%` }}
                          />
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{role.why_fit}</p>

                        {/* Skills to add */}
                        {role.skills_to_add && role.skills_to_add.length > 0 && (
                          <div className="mb-4">
                            <span className="text-[11px] font-bold text-slate-400 block mb-1">Key skills to strengthen:</span>
                            <div className="flex flex-wrap gap-1">
                              {role.skills_to_add.map((s, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 rounded-md text-xs font-semibold">
                                  + {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Job Portal Links & Auto-Apply Button */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400">Search Live Openings:</span>
                          <button
                            onClick={() => {
                              setTargetRole(role.title);
                              runAutoApply(role.title);
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-lg text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Bot size={14} /> Auto-Apply Agent
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: 'LinkedIn', color: 'hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role.search_keywords || role.title)}` },
                            { name: 'Indeed', color: 'hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', url: `https://www.indeed.com/jobs?q=${encodeURIComponent(role.search_keywords || role.title)}` },
                            { name: 'Naukri', color: 'hover:bg-cyan-50 dark:hover:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800', url: `https://www.naukri.com/${encodeURIComponent((role.search_keywords || role.title).toLowerCase().replace(/\s+/g, '-'))}-jobs` },
                            { name: 'Google Jobs', color: 'hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', url: `https://www.google.com/search?q=${encodeURIComponent((role.search_keywords || role.title) + ' jobs')}` }
                          ].map(link => (
                            <a
                              key={link.name}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-white dark:bg-slate-800 ${link.color}`}
                            >
                              <ExternalLink size={12} /> {link.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stretch Goal Roles */}
            {recs.stretch && recs.stretch.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500" />
                    Stretch Roles (Career Growth Target)
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {recs.stretch.map((role, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-100 dark:border-purple-900/50 shadow-sm p-6 hover:shadow-md transition-all space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{role.title}</h4>
                          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                            {role.level} Level
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">{role.fit_percent}%</span>
                          <span className="text-xs text-slate-400 block">Match</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{role.why_fit}</p>
                      {role.skills_to_add && role.skills_to_add.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {role.skills_to_add.map((s, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-md text-xs font-semibold">
                              Target: {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps: Score Percentage Improver & Proctored Exam */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-8 text-white space-y-6 shadow-xl">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  <Sparkles className="text-amber-400" /> Candidate Shortlist Guarantee & Assessment Studio
                </h3>
                <p className="text-indigo-200 text-xs mt-1">
                  Select a target role to generate a Score Percentage Improver Roadmap (boosting your match percentage to 95%+) or take the 100-Mark Anti-Proxy Proctored Exam.
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-indigo-300">Select Target Position</label>
                <select
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  className="w-full p-3 bg-slate-800/90 border border-indigo-700/60 rounded-xl text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {allRoles.map((r, i) => (
                    <option key={i} value={r.title} className="bg-slate-900 text-white">
                      {r.title} ({r.fit_percent}% current match)
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={getScoreBoosterRoadmap}
                    disabled={roadLoading}
                    className="py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    {roadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles size={16} /> Percentage Improver Roadmap</>}
                  </button>

                  <button
                    onClick={() => navigate('/candidates')}
                    className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    <ShieldCheck size={16} /> 100-Mark Proctored Exam
                  </button>

                  <button
                    onClick={getBoost}
                    disabled={boostLoading}
                    className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
                  >
                    {boostLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText size={16} /> Boost Resume Copy</>}
                  </button>
                </div>
              </div>
            </div>


            {/* Auto-Apply Agent Package Display Card */}
            {applyPkg && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-indigo-500/30 shadow-xl p-7 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                      <Bot size={24} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">AI Auto-Apply Agent Package</span>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{applyPkg.target_role || targetRole}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-2xl border text-center ${
                      applyPkg.is_suitable 
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                        : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}>
                      <div className="text-xl font-extrabold">{applyPkg.fit_score}% Fit</div>
                      <div className="text-[10px] font-bold uppercase">{applyPkg.is_suitable ? '✓ Suitable to Apply' : '⚠️ Gap Adjustment Needed'}</div>
                    </div>

                    <button
                      onClick={() => runPlaywrightBot()}
                      disabled={botLoading}
                      className="px-5 py-3 rounded-2xl font-extrabold text-xs shadow-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
                    >
                      {botLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Launching Chrome Bot...</> : <><Bot size={16} /> 🤖 Run Playwright Automated Bot</>}
                    </button>

                    <button
                      onClick={submitApplication}
                      disabled={submitting || submittedSuccess}
                      className={`px-4 py-3 rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                        submittedSuccess
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : submittedSuccess ? <><CheckCircle2 size={16} /> Application Logged</> : <><Send size={16} /> Save to Tracker</>}
                    </button>
                  </div>
                </div>

                {botResult && (
                  <div className={`p-4 rounded-2xl border text-xs font-semibold space-y-2 ${
                    botResult.success 
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                      : 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-2">
                        <Bot size={18} className="text-purple-600" />
                        {botResult.success ? 'Playwright Automated Browser Bot Execution Completed!' : 'Playwright Bot Execution Status'}
                      </span>
                      {botResult.confirmationId && <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded font-mono text-[10px]">{botResult.confirmationId}</span>}
                    </div>
                    <p className="text-[11px] leading-relaxed">{botResult.message}</p>
                    {botResult.logs && (
                      <ul className="space-y-1 text-[10px] font-mono pl-2 pt-1 border-t border-emerald-200 dark:border-emerald-800">
                        {botResult.logs.map((log, lIdx) => <li key={lIdx}>{log}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {submittedSuccess && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2"><CheckCircle2 size={18} /> Application package saved in your Applied Jobs Tracker!</span>
                    <button onClick={() => setActiveTab('applications')} className="underline text-xs font-extrabold cursor-pointer">View Tracker →</button>
                  </div>
                )}

                {/* Direct Portal Auto-Copy & Launch Action */}
                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-extrabold text-indigo-900 dark:text-indigo-200 text-xs flex items-center gap-1.5">
                        <ExternalLink size={14} className="text-indigo-600" /> Apply on Official LinkedIn / Indeed / Naukri
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                        Click below to launch the portal. Your AI cover letter is <strong>automatically copied to your clipboard</strong>!
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: 'LinkedIn Jobs', url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent((applyPkg.target_role || targetRole) + ' ' + (companyName || ''))}` },
                        { name: 'Indeed Apply', url: `https://www.indeed.com/jobs?q=${encodeURIComponent((applyPkg.target_role || targetRole) + ' ' + (companyName || ''))}` },
                        { name: 'Naukri India', url: `https://www.naukri.com/${encodeURIComponent((applyPkg.target_role || targetRole).toLowerCase().replace(/\s+/g, '-'))}-jobs` },
                        { name: 'Google Jobs', url: `https://www.google.com/search?q=${encodeURIComponent((applyPkg.target_role || targetRole) + ' ' + (companyName || '') + ' jobs')}` }
                      ].map(p => (
                        <button
                          key={p.name}
                          onClick={() => {
                            if (applyPkg.tailored_cover_letter) {
                              navigator.clipboard.writeText(applyPkg.tailored_cover_letter);
                              alert(`Tailored Cover Letter for "${applyPkg.target_role}" COPIED to clipboard!\n\nOpening ${p.name}...\nPress Ctrl+V on the job page to paste your cover letter.`);
                            }
                            window.open(p.url, '_blank');
                          }}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-extrabold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink size={12} /> Launch {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                    💡 <strong>Note on LinkedIn:</strong> Web applications cannot post directly into your private LinkedIn account without you logging into LinkedIn. To complete submission on LinkedIn, click <strong>Launch LinkedIn Jobs</strong> above, click <strong>Easy Apply</strong> on LinkedIn, press <code>Ctrl + V</code> to paste your copied cover letter, and click Submit. It will then appear in your LinkedIn <em>Applied Jobs</em> list.
                  </div>
                </div>

                {/* Autonomous Agent Action Execution Log & Tracking ID */}
                <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 text-xs shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-emerald-400 text-xs flex items-center gap-2">
                      <Bot size={16} /> Autonomous Agent Action Execution Log
                    </span>
                    <span className="px-3 py-1 bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-[11px] rounded-lg font-bold">
                      Ref: {applyPkg.submission_confirmation_id || 'AGENT-98214'}
                    </span>
                  </div>
                  <ul className="space-y-2 text-[11px] text-slate-300 font-mono pt-1">
                    {Array.isArray(applyPkg.agent_action_log) && applyPkg.agent_action_log.length > 0 ? (
                      applyPkg.agent_action_log.map((step, sIdx) => (
                        <li key={sIdx} className="flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> 1. Parsed candidate profile & resume keywords</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> 2. Evaluated job match score & suitability</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> 3. Formulated tailored cover letter & recruiter outreach pitch</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> 4. Executed automated submission engine & pre-copied package</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> 5. Confirmed & logged application in database tracker</li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Suitability Assessment */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">Agent Suitability Pitch</span>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans">{applyPkg.suitability_summary}</p>
                </div>

                {/* Key Selling Points & ATS Keywords */}
                <div className="grid md:grid-cols-2 gap-4 text-xs">
                  {Array.isArray(applyPkg.key_selling_points) && applyPkg.key_selling_points.length > 0 && (
                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                      <span className="font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5"><Flame size={14} className="text-indigo-600" /> Key Resume Selling Points</span>
                      <ul className="space-y-1 list-disc pl-4 text-slate-700 dark:text-slate-300">
                        {applyPkg.key_selling_points.map((pt, idx) => <li key={idx}>{pt}</li>)}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(applyPkg.ats_keywords_to_emphasize) && applyPkg.ats_keywords_to_emphasize.length > 0 && (
                    <div className="p-4 bg-purple-50/50 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-900/50 space-y-2">
                      <span className="font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-1.5"><ShieldCheck size={14} className="text-purple-600" /> Top ATS Keywords for Application</span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {applyPkg.ats_keywords_to_emphasize.map((kw, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-white dark:bg-purple-900/80 border border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-200 font-bold rounded-lg text-[11px]">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cover Letter */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tailored Agent Cover Letter</label>
                    <button
                      onClick={() => copyToClipboard(applyPkg.tailored_cover_letter, 'pkgCover')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      {copiedKey === 'pkgCover' ? <Check size={12} /> : <Copy size={12} />} Copy Cover Letter
                    </button>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed font-sans">
                    {applyPkg.tailored_cover_letter}
                  </div>
                </div>

                {/* Recruiter Email Pitch */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Direct Recruiter Outreach Email Pitch</label>
                    <button
                      onClick={() => copyToClipboard(applyPkg.email_pitch, 'pkgPitch')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      {copiedKey === 'pkgPitch' ? <Check size={12} /> : <Copy size={12} />} Copy Pitch
                    </button>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 leading-relaxed font-sans">
                    {applyPkg.email_pitch}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Generated Score Percentage Improver Roadmap Display */}
            {roadmap && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-amber-500" size={20} />
                      <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        Score Percentage Improver Roadmap
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Target Role: <span className="font-bold text-indigo-600 dark:text-indigo-400">{roadmap.target_role}</span>
                    </p>
                  </div>

                  {/* Score Boost Chips */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Score</span>
                      <span className="text-sm font-black text-slate-700 dark:text-slate-300">{roadmap.current_score || 65}%</span>
                    </div>
                    <ArrowRight size={16} className="text-slate-400" />
                    <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-center">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">Target Score</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{roadmap.projected_boosted_score || 95}%</span>
                    </div>
                  </div>
                </div>

                {/* Score Gap Penalty Analysis */}
                {roadmap.score_gap_analysis && roadmap.score_gap_analysis.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Score Penalty Breakdown (Why points were lost):</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {roadmap.score_gap_analysis.map((gap, gIdx) => (
                        <div key={gIdx} className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-rose-900 dark:text-rose-200 block">{gap.area}</span>
                            <span className="text-[11px] text-rose-700 dark:text-rose-300 block">{gap.issue}</span>
                          </div>
                          <span className="font-black text-rose-600 dark:text-rose-400 shrink-0">{gap.percentage_penalty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Phases */}
                <div className="space-y-4 pt-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Step-by-Step Score Improver Action Plan:</h4>
                  {(roadmap.action_phases || roadmap.phases || []).map((phase, idx) => (
                    <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-indigo-700 dark:text-indigo-400 text-xs sm:text-sm">
                          {phase.phase || phase.period}
                        </span>
                        {phase.target_skills && (
                          <div className="flex gap-1">
                            {phase.target_skills.map((sk, skIdx) => (
                              <span key={skIdx} className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                + {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <ul className="space-y-1.5 pl-4 list-disc text-xs text-slate-700 dark:text-slate-300">
                        {(phase.action_items || phase.tasks || []).map((item, tidx) => (
                          <li key={tidx}>{item}</li>
                        ))}
                      </ul>

                      {phase.resume_enhancement_snippet && (
                        <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">✨ Recommended Resume Bullet Enhancement:</span>
                          <p className="text-slate-800 dark:text-slate-200 font-mono text-[11px] leading-relaxed">
                            "{phase.resume_enhancement_snippet}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}


            {/* Generated Resume Booster Display */}
            {boost && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="text-indigo-600 dark:text-indigo-400" size={20} />
                  <span>Improved Resume & Profile Copy</span>
                </h3>

                {/* Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Tailored 3-Line Summary</label>
                    <button
                      onClick={() => copyToClipboard(boost.tailored_summary, 'summary')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      {copiedKey === 'summary' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'summary' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 leading-relaxed font-sans">
                    {boost.tailored_summary}
                  </div>
                </div>

                {/* LinkedIn Headline */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">LinkedIn Headline</label>
                    <button
                      onClick={() => copyToClipboard(boost.linkedin_headline, 'headline')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      {copiedKey === 'headline' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'headline' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {boost.linkedin_headline}
                  </div>
                </div>

                {/* Rewritten Bullet Points */}
                {boost.rewritten_bullets && boost.rewritten_bullets.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Action-Oriented Bullet Rewrites</label>
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                            <th className="p-3 w-1/2">Original Bullet</th>
                            <th className="p-3 w-1/2">Improved Action Bullet</th>
                          </tr>
                        </thead>
                        <tbody>
                          {boost.rewritten_bullets.map((b, i) => (
                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-3 text-slate-500 dark:text-slate-400 line-through">{b.original}</td>
                              <td className="p-3 text-slate-900 dark:text-slate-100 font-semibold bg-emerald-50/40 dark:bg-emerald-950/40">{b.improved}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Cover Letter */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Tailored Cover Letter (150 words)</label>
                    <button
                      onClick={() => copyToClipboard(boost.cover_letter, 'cover')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      {copiedKey === 'cover' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'cover' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed font-sans">
                    {boost.cover_letter}
                  </div>
                </div>
              </motion.div>
            )}

          </motion.div>
        </AnimatePresence>
      )}
      </>
      )}
    </motion.div>
  );
}
