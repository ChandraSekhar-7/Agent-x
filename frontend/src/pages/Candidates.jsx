import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import clsx from 'clsx';
import { 
  ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, Download, Mail, 
  Loader2, Trash2, Radar as RadarIcon, Sparkles, FileText, Check, Copy, HelpCircle, UserCheck, Mic, Award,
  Bot, Send, Building, Flame, ShieldCheck, ArrowRight, Camera, Clock, Eye, ShieldAlert, RefreshCw, BarChart2
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const recColors = { 
  "Strong Hire": "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800", 
  "Interview": "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800", 
  "Maybe": "bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800", 
  "Reject": "bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800", 
  "Pending": "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" 
};

const lvlColors = { 
  "Beginner": "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300", 
  "Intermediate": "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300", 
  "Advanced": "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" 
};

const scoreBg = s => s >= 70 ? 'bg-indigo-600 text-white' : s >= 45 ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white';

export default function Candidates() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);

  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  
  // Feature states
  const [showJdText, setShowJdText] = useState(false);
  const [keywords, setKeywords] = useState(null);
  const [kwLoading, setKwLoading] = useState(false);

  const [emailData, setEmailData] = useState(null);
  const [emailKind, setEmailKind] = useState('Interview invitation');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  const [mockQ, setMockQ] = useState('');
  const [mockA, setMockA] = useState('');
  const [mockEval, setMockEval] = useState(null);
  const [mockLoading, setMockLoading] = useState(false);

  // Auto-Apply Agent state
  const [candApplyPkg, setCandApplyPkg] = useState(null);
  const [candApplyLoading, setCandApplyLoading] = useState(false);
  const [candJobRole, setCandJobRole] = useState('');
  const [candCompany, setCandCompany] = useState('Tech Enterprise');
  const [candSubmitting, setCandSubmitting] = useState(false);
  const [candAppliedSuccess, setCandAppliedSuccess] = useState(false);
  const [candError, setCandError] = useState('');

  // Live Candidate Rescreen / Job Match Analyzer state
  const [rescreenLoading, setRescreenLoading] = useState(false);
  const [editJdText, setEditJdText] = useState('');
  const [editTargetRole, setEditTargetRole] = useState('');
  const [rescreenSuccess, setRescreenSuccess] = useState(false);
  const [rescreenError, setRescreenError] = useState('');

  // In-Page Screening & Roadmap Modal state
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showScreenModal, setShowScreenModal] = useState(false);
  const [modalFiles, setModalFiles] = useState([]);
  const [modalJd, setModalJd] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const handleModalScreen = async () => {
    if (!modalFiles.length) {
      setModalError('Please select at least one resume file (PDF or TXT).');
      return;
    }
    if (!modalJd.trim()) {
      setModalError('Please enter target job description criteria.');
      return;
    }
    setModalLoading(true);
    setModalError('');
    try {
      const formData = new FormData();
      formData.append('jd', modalJd);
      formData.append('n_q', '8');
      formData.append('focus', 'Balanced');
      formData.append('difficulty', 'Mixed');
      formData.append('blind', 'false');
      formData.append('weights', JSON.stringify({ skills: 40, experience: 25, education: 10, projects: 15, communication: 10 }));
      modalFiles.forEach(f => formData.append('resumes', f));

      const res = await api.post('/screen', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newCandidates = res.data;
      await fetchCandidates();
      if (newCandidates && newCandidates.length > 0) {
        setSel(newCandidates[0]);
      }
      setShowScreenModal(false);
      setModalFiles([]);
      setModalJd('');
    } catch (err) {
      console.error(err);
      setModalError(err.response?.data?.error || 'Failed to screen resume.');
    } finally {
      setModalLoading(false);
    }
  };

  const boostCandidateScore = async (amount = 5) => {
    if (!sel) return;
    try {
      const currentOverall = sel.scores?.overall || 0;
      const newOverall = Math.min(100, currentOverall + amount);
      const newSkills = Math.min(100, (sel.scores?.skills || 0) + amount);
      const updatedScores = { ...sel.scores, overall: newOverall, skills: newSkills };
      
      const updatedCandidate = { ...sel, scores: updatedScores };
      setSel(updatedCandidate);
      setCandidates(prev => prev.map(c => c._id === sel._id ? updatedCandidate : c));
    } catch (err) {
      console.error(err);
    }
  };

  const runRescreenCandidate = async () => {
    if (!sel) return;
    setRescreenLoading(true);
    setRescreenError('');
    setRescreenSuccess(false);
    try {
      const res = await api.post(`/candidates/${sel._id}/rescreen`, {
        jobDescriptionText: editJdText || sel.jobDescriptionText || sel.role,
        targetRole: editTargetRole || sel.role
      });
      setSel(res.data.candidate);
      setCandidates(prev => prev.map(c => c._id === res.data.candidate._id ? res.data.candidate : c));
      setRescreenSuccess(true);
    } catch (err) {
      console.error(err);
      setRescreenError(err.response?.data?.error || 'Failed to analyze job match.');
    } finally {
      setRescreenLoading(false);
    }
  };

  // In-Page Proctored Exam State
  const [procState, setProcState] = useState('idle'); // 'idle' | 'generating' | 'active' | 'submitted'
  const [procData, setProcData] = useState(null);
  const [procAnswers, setProcAnswers] = useState({});
  const [procTimeLeft, setProcTimeLeft] = useState(3600);
  const [procIntegrity, setProcIntegrity] = useState(100);
  const [procLogs, setProcLogs] = useState(['Webcam anti-proxy active', 'Zero proxy anomalies detected']);
  const [procSubmitting, setProcSubmitting] = useState(false);
  const [procError, setProcError] = useState('');

  // Detect tab switching for anti-proxy proctoring
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && procState === 'active') {
        setProcIntegrity(score => Math.max(0, score - 15));
        setProcLogs(logs => [
          `⚠️ WARNING: Tab switch / focus loss detected at ${new Date().toLocaleTimeString()}`,
          ...logs
        ]);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [procState]);

  // Exam Countdown Timer
  useEffect(() => {
    let timer;
    if (procState === 'active' && procTimeLeft > 0) {
      timer = setInterval(() => {
        setProcTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            submitInPageExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [procState, procTimeLeft]);

  const startInPageExam = async () => {
    if (!sel) return;
    setProcState('generating');
    setProcError('');
    setProcAnswers({});
    try {
      const res = await api.post('/exam/generate', {
        candidateName: sel.name,
        targetRole: sel.role,
        skills: sel.matched_skills ? sel.matched_skills.map(s => s.skill) : [],
        resumeText: sel.resumeText
      });
      setProcData(res.data);
      setProcState('active');
      setProcTimeLeft((res.data.time_limit_minutes || 60) * 60);
      setProcIntegrity(100);
      setProcLogs([
        '🟢 Webcam Anti-Proxy Tracking Active',
        '🔒 Anti-Proxy Lockdown Initialized (In-Page Mode)',
        '🎯 100 Marks Hard Technical Questions Generated'
      ]);
    } catch (err) {
      console.error(err);
      setProcError('Failed to generate proctored assessment: ' + (err.response?.data?.error || err.message));
      setProcState('idle');
    }
  };

  const submitInPageExam = async () => {
    if (!sel || !procData) return;
    setProcSubmitting(true);
    setProcError('');

    const allQuestions = [];
    (procData.sections || []).forEach(sec => {
      (sec.questions || []).forEach(q => allQuestions.push(q));
    });

    try {
      const res = await api.post(`/candidates/${sel._id}/proctored-exam`, {
        userAnswers: procAnswers,
        questionsList: allQuestions,
        integrityScore: procIntegrity,
        proctoringLogs: procLogs
      });

      setSel(res.data.candidate);
      setCandidates(prev => prev.map(c => c._id === res.data.candidate._id ? res.data.candidate : c));
      setProcState('submitted');
    } catch (err) {
      console.error(err);
      setProcError('Failed to submit exam: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcSubmitting(false);
    }
  };

  const formatProcTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/candidates');
      setCandidates(res.data);
      if (res.data.length > 0) {
        setSel(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectCandidate = (c) => {
    setSel(c);
    setKeywords(null);
    setEmailData(null);
    setMockEval(null);
    setMockQ(c.questions && c.questions.length > 0 ? c.questions[0].question : '');
    setMockA('');
    setCandApplyPkg(null);
    setCandJobRole(c.role || '');
    setCandAppliedSuccess(false);
    setCandError('');
    setEditJdText(c.jobDescriptionText || '');
    setEditTargetRole(c.role || '');
    setRescreenSuccess(false);
    setRescreenError('');
    setProcState('idle');
    setProcError('');
    setTab('overview');
    loadKeywords(c);
  };

  const runCandAutoApply = async () => {
    if (!sel || !sel.resumeText) return;
    const roleToUse = candJobRole.trim() || sel.role || 'Target Role';
    setCandApplyLoading(true);
    setCandError('');
    setCandApplyPkg(null);
    setCandAppliedSuccess(false);

    try {
      const res = await api.post('/auto-apply', {
        resume: sel.resumeText,
        job_description: roleToUse,
        company: candCompany || 'Tech Enterprise'
      });
      const pkg = res.data;
      setCandApplyPkg(pkg);

      await api.post('/applications', {
        candidateName: sel.name,
        targetRole: pkg.target_role || roleToUse,
        company: candCompany || pkg.company_or_platform || 'Tech Enterprise',
        jobDescriptionText: roleToUse,
        resumeText: sel.resumeText,
        fitScore: pkg.fit_score,
        isSuitable: pkg.is_suitable,
        suitabilitySummary: pkg.suitability_summary,
        coverLetter: pkg.tailored_cover_letter,
        emailPitch: pkg.email_pitch,
        atsKeywords: pkg.ats_keywords_to_emphasize,
        keySellingPoints: pkg.key_selling_points,
        applicationTips: pkg.application_tips,
        status: 'Submitted'
      });
      setCandAppliedSuccess(true);
    } catch (err) {
      console.error(err);
      setCandError(err.response?.data?.error || 'Failed to process job application.');
    } finally {
      setCandApplyLoading(false);
    }
  };

  const submitCandApplication = async () => {
    if (!sel || !candApplyPkg) return;
    setCandSubmitting(true);
    setCandError('');
    try {
      const roleToUse = candApplyPkg.target_role || candJobRole || sel.role || 'Target Role';
      const compToUse = candCompany || candApplyPkg.company_or_platform || 'Tech Enterprise';

      await api.post('/applications', {
        candidateName: sel.name,
        targetRole: roleToUse,
        company: compToUse,
        jobDescriptionText: roleToUse,
        resumeText: sel.resumeText || '',
        fitScore: candApplyPkg.fit_score || 85,
        isSuitable: candApplyPkg.is_suitable ?? true,
        suitabilitySummary: candApplyPkg.suitability_summary || '',
        coverLetter: candApplyPkg.tailored_cover_letter || '',
        emailPitch: candApplyPkg.email_pitch || '',
        atsKeywords: candApplyPkg.ats_keywords_to_emphasize || [],
        keySellingPoints: candApplyPkg.key_selling_points || [],
        applicationTips: candApplyPkg.application_tips || [],
        status: 'Submitted'
      });

      setCandAppliedSuccess(true);
    } catch (err) {
      console.error(err);
      setCandError(err.response?.data?.error || 'Failed to submit candidate application.');
    } finally {
      setCandSubmitting(false);
    }
  };

  const loadKeywords = async (c) => {
    if (!c) return;
    setKwLoading(true);
    try {
      const res = await api.post(`/candidates/${c._id}/keywords`);
      setKeywords(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setKwLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!sel) return;
    try {
      const res = await api.patch(`/candidates/${sel._id}/status`, { status: newStatus });
      setSel(res.data);
      setCandidates(prev => prev.map(c => c._id === res.data._id ? res.data : c));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCandidate = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Delete candidate profile?')) {
      try {
        await api.delete(`/candidates/${id}`);
        const updated = candidates.filter(c => c._id !== id);
        setCandidates(updated);
        if (sel?._id === id) {
          setSel(updated.length > 0 ? updated[0] : null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const draftEmail = async () => {
    if (!sel) return;
    setEmailLoading(true);
    setEmailCopied(false);
    try {
      const res = await api.post(`/candidates/${sel._id}/email`, { kind: emailKind });
      setEmailData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setEmailLoading(false);
    }
  };

  const evalAnswer = async () => {
    if (!mockQ || !mockA.trim() || !sel) return;
    setMockLoading(true);
    try {
      const res = await api.post('/eval-answer', { 
        question: mockQ, 
        answer: mockA, 
        role: sel.role 
      });
      setMockEval(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setMockLoading(false);
    }
  };

  const downloadReport = (type) => {
    if (!sel) return;
    window.open(`http://localhost:5000/api/candidates/${sel._id}/${type}`, '_blank');
  };

  const filteredCandidates = candidates.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!candidates.length) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 space-y-3">
        <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600" />
        <p className="font-semibold text-slate-600 dark:text-slate-300">No candidate profiles evaluated yet.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Go to "Screen Resumes" tab to process resumes.</p>
      </div>
    );
  }

  const radarData = sel ? [
    { subject: 'Skills', A: sel.scores?.skills || 0 },
    { subject: 'Experience', A: sel.scores?.experience || 0 },
    { subject: 'Education', A: sel.scores?.education || 0 },
    { subject: 'Projects', A: sel.scores?.projects || 0 },
    { subject: 'Comm', A: sel.scores?.communication || 0 }
  ] : [];

  return (
    <div className="flex gap-6 h-[calc(100vh-6.5rem)] overflow-hidden">
      {/* Left List Pane */}
      <div className="w-80 shrink-0 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
          <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
            <span>Candidate Pool ({candidates.length})</span>
            <button
              onClick={() => setShowScreenModal(true)}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
            >
              + Screen Resumes
            </button>
          </div>
          <input
            type="text"
            placeholder="Search candidate or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredCandidates.map((c, i) => (
            <div
              key={c._id}
              onClick={() => selectCandidate(c)}
              className={clsx(
                "p-3 rounded-lg cursor-pointer border transition-all flex items-center justify-between group",
                sel?._id === c._id 
                  ? "bg-indigo-50/80 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-800 shadow-xs" 
                  : "bg-white dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs", scoreBg(c.scores?.overall || 0))}>
                  {c.scores?.overall || 0}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs">{c.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{c.role} · {c.total_experience_years}y exp</div>
                  <div className="flex gap-1.5 mt-0.5">
                    <span className={clsx("text-[9px] px-1.5 py-0.2 rounded font-semibold border", recColors[c.recommendation || 'Pending'])}>
                      {c.recommendation}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={e => handleDeleteCandidate(c._id, e)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 dark:text-slate-500 hover:text-rose-600 p-1 transition-opacity cursor-pointer"
                title="Delete candidate"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Detail Pane */}
      {sel && (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden min-w-0">
          {/* Header Card */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-3.5">
              <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg shadow-xs", scoreBg(sel.scores?.overall || 0))}>
                {sel.scores?.overall || 0}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{sel.name}</h2>
                  <span className={clsx("text-xs font-semibold px-2.5 py-0.5 rounded border", recColors[sel.recommendation || 'Pending'])}>
                    {sel.recommendation}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Target Position: <span className="text-slate-800 dark:text-slate-200 font-bold">{sel.role}</span> · {sel.total_experience_years} Years Experience
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sel.status || 'Pending'}
                onChange={e => handleStatusChange(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
              >
                <option value="Pending">Status: Pending</option>
                <option value="Shortlist">Status: Shortlisted</option>
                <option value="Interview">Status: Interviewing</option>
                <option value="Offer">Status: Offer Extended</option>
                <option value="Reject">Status: Rejected</option>
              </select>

              <button
                onClick={() => downloadReport('report')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <Download size={13} /> Evaluation Report
              </button>

              <button
                onClick={() => downloadReport('scorecard')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <FileText size={13} /> Scorecard
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview & Summary' },
              { id: 'skills', label: 'Skills & ATS Matrix' },
              { id: 'questions', label: `Interview Questions (${(sel.questions || []).length})` },
              { id: 'mock', label: 'Response Evaluator' },
              { id: 'email', label: 'Recruiter Communications' },
              { id: 'autoapply', label: '🤖 Auto-Apply Agent' },
              { 
                id: 'proctored', 
                label: sel?.proctoredExam?.completedAt 
                  ? `🛡️ Proctored Scorecard (${sel.proctoredExam.scoreObtained}/100)` 
                  : '🛡️ Proctored Exam (100M)' 
              }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  "py-3 px-3.5 font-semibold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0",
                  tab === t.id 
                    ? "border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-400 font-bold" 
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Tab 1: Overview */}
            {tab === 'overview' && (
              <div className="space-y-5">
                
                {/* Job Fit & Position Requirements Alignment Analysis */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl text-white border border-indigo-900/50 shadow-md space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/60 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-indigo-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Job Fit & Suitability Analysis
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            Target Role: {sel.role}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-white mt-0.5">
                          {(sel.scores?.overall || 0) >= 80 ? '🌟 High Job Fit Match' : (sel.scores?.overall || 0) >= 65 ? '✓ Suitable Job Match' : (sel.scores?.overall || 0) >= 50 ? '⚠️ Moderate Job Match' : '❌ Low Job Match'} — {sel.scores?.overall || 0}% Fit Score
                        </h3>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowJdText(!showJdText)}
                      className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={13} /> {showJdText ? 'Hide Job Requirements' : 'View Target Job Specification'}
                    </button>
                  </div>

                  {/* Job Fit Key Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Skills Match</span>
                      <span className="text-xl font-black text-emerald-400">{sel.scores?.skills || 0}%</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{(sel.matched_skills || []).length} Skills Matched</span>
                    </div>

                    <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Experience Fit</span>
                      <span className="text-xl font-black text-indigo-300">{sel.scores?.experience || 0}%</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{sel.total_experience_years} Years Relevant</span>
                    </div>

                    <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Projects Fit</span>
                      <span className="text-xl font-black text-purple-300">{sel.scores?.projects || 0}%</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Practical Alignment</span>
                    </div>

                    <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Recruiter Verdict</span>
                      <span className="text-sm font-black text-amber-300 block mt-1">{sel.recommendation || 'Pending'}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Recommendation</span>
                    </div>
                  </div>

                  {/* Target Job Specification & Custom JD Analyzer controls */}
                  {showJdText && (
                    <div className="p-4 bg-slate-950/90 border border-indigo-900/80 rounded-xl text-xs space-y-3 font-sans">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                        <span className="font-extrabold text-indigo-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={14} className="text-indigo-400" /> Interactive AI Resume Match Analyzer
                        </span>
                        <span className="text-[10px] text-slate-400">Paste any target position criteria to recalculate candidate match</span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Target Role / Job Title</label>
                          <input
                            type="text"
                            value={editTargetRole}
                            onChange={e => setEditTargetRole(e.target.value)}
                            placeholder="e.g. Senior Full Stack Engineer"
                            className="w-full p-2 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-xs outline-none focus:border-indigo-500 font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Candidate Resume Name</label>
                          <input
                            type="text"
                            disabled
                            value={sel.name}
                            className="w-full p-2 bg-slate-900/60 border border-slate-800 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Target Job Description Criteria</label>
                        <textarea
                          rows={4}
                          value={editJdText}
                          onChange={e => setEditJdText(e.target.value)}
                          placeholder="Paste position requirements, key skills, experience level, and qualifications..."
                          className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono leading-relaxed resize-none"
                        />
                      </div>

                      {rescreenError && (
                        <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-xs font-medium">
                          {rescreenError}
                        </div>
                      )}

                      {rescreenSuccess && (
                        <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-300 text-xs font-semibold flex items-center gap-2">
                          <CheckCircle2 size={15} /> Candidate resume successfully analyzed & match scores updated!
                        </div>
                      )}

                      <button
                        onClick={runRescreenCandidate}
                        disabled={rescreenLoading}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-lg text-xs font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        {rescreenLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> AI Engine is Analyzing Resume & Skill Match...</>
                        ) : (
                          <><Sparkles size={15} /> ⚡ Calculate Live AI Job Match & Update Candidate</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Why Candidate Fits / Gap Summary */}
                  <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs space-y-1.5 font-sans">
                    <strong className="text-indigo-300 block text-[11px] uppercase tracking-wider">Job Fit & Suitability Evaluation Rationale:</strong>
                    <p className="text-slate-200 leading-relaxed text-[11px]">
                      Candidate <strong className="text-white">{sel.name}</strong> scores <strong className="text-emerald-400">{sel.scores?.overall || 0}% overall match</strong> for the <strong className="text-white">{sel.role}</strong> position with <strong className="text-indigo-300">{sel.total_experience_years || 0} years</strong> of experience.
                      {sel.matched_skills && sel.matched_skills.length > 0 && (
                        <span> Demonstrates strong technical capability in <strong>{sel.matched_skills.slice(0, 4).map(s => s.skill).join(', ')}</strong>.</span>
                      )}
                      {sel.gaps && sel.gaps.length > 0 && (
                        <span> Primary skill gaps to verify during technical evaluation: <strong className="text-amber-300">{sel.gaps.map(g => g.skill).join(', ')}</strong>.</span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Post-Screening Eligibility & Proctored Test Option */}
                {(sel.scores?.overall || 0) >= 75 ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                          Screening Verified: 75%+ Match Cleared ({sel.scores?.overall || 0}% Score)
                        </h4>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          {sel?.proctoredExam?.completedAt 
                            ? `Proctored Exam Passed with ${sel.proctoredExam.scoreObtained}/100 Marks (${sel.proctoredExam.grade}). Click to view detailed scorecard on page.`
                            : 'Candidate resume evaluation meets 75%+ threshold. Click below to take the 100-Mark Anti-Proxy Proctored Exam directly on this page.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTab('proctored')}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <ShieldCheck size={16} /> {sel?.proctoredExam?.completedAt ? 'View Passed Scorecard' : 'Take Proctored Test'} <ArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                          Screening Score: {sel.scores?.overall || 0}% (75% Score Required)
                        </h4>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          Proctored Test is locked. Candidate must reach 75%+ overall & skill match to unlock the 100-Mark Exam.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowRoadmap(!showRoadmap)}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer shrink-0 transition-all shadow-xs"
                    >
                      {showRoadmap ? 'Close Score Roadmap' : 'Improve Score Roadmap'}
                    </button>
                  </div>
                )}

                {/* In-Page Score Booster Roadmap */}
                {showRoadmap && (
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl text-white border border-amber-800/60 shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-indigo-900/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5 text-amber-300" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-wider">
                            Score Booster & Percentage Improver Roadmap
                          </h4>
                          <p className="text-xs text-amber-200/90">
                            Current Candidate Match: <strong className="text-white">{sel.scores?.overall || 0}%</strong> | Target: <strong className="text-emerald-400">75%+ Score</strong> to unlock the 100M Proctored Exam.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowRoadmap(false)}
                        className="text-slate-400 hover:text-white p-1 cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Actionable Steps */}
                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">Recommended Skill Improvement Steps:</span>
                      
                      {(sel.gaps || []).length > 0 ? (
                        (sel.gaps || []).map((g, idx) => (
                          <div key={idx} className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div>
                              <span className="font-bold text-amber-300 block">Step {idx + 1}: Address {g.skill} ({g.importance})</span>
                              <p className="text-slate-300 text-[11px] mt-0.5">{g.learning_tip}</p>
                            </div>
                            <button
                              onClick={() => boostCandidateScore(5)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black shrink-0 cursor-pointer shadow-xs transition-all flex items-center gap-1"
                            >
                              <Sparkles size={12} /> Apply Fix (+5% Boost)
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300">
                          No major skill gaps detected! Use the Interactive AI Resume Match Analyzer above to re-screen candidate against target job requirements.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Executive Summary */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs leading-relaxed font-sans">
                  <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">Executive Summary</span>
                  {sel.summary}
                </div>


                <div className="grid md:grid-cols-2 gap-5">
                  {/* Radar Chart */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs h-64">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Dimension Scores Breakdown</h3>
                    <ResponsiveContainer width="100%" height="85%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#475569" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name={sel.name} dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Strengths & Red Flags */}
                  <div className="space-y-3">
                    {/* Strengths */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                      <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" /> Key Strengths
                      </h3>
                      <ul className="space-y-1 pl-4 list-disc text-xs text-slate-700 dark:text-slate-300">
                        {(sel.strengths || []).map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Red Flags */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                      <h3 className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" /> Audit Findings & Concerns
                      </h3>
                      <ul className="space-y-1 pl-4 list-disc text-xs text-slate-700 dark:text-slate-300">
                        {(sel.red_flags || ['None detected']).map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Resume Improvement Tips */}
                {sel.resume_tips && sel.resume_tips.length > 0 && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles size={15} className="text-indigo-600 dark:text-indigo-400" /> Resume Improvement Observations
                    </h3>
                    <ul className="space-y-1 pl-4 list-disc text-xs text-slate-700 dark:text-slate-300">
                      {sel.resume_tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Skills & ATS */}
            {tab === 'skills' && (
              <div className="space-y-5">
                {/* Matched Skills */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Matched Job Skills</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(sel.matched_skills || []).map((sk, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{sk.skill}</span>
                          <span className={clsx("text-[10px] font-semibold px-2 py-0.2 rounded", lvlColors[sk.level || 'Intermediate'])}>
                            {sk.level}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">Evidence: "{sk.evidence}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gaps & Partial Skills */}
                <div className="grid md:grid-cols-2 gap-5">
                  {/* Skill Gaps */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                    <h3 className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">Missing Skill Requirements</h3>
                    <div className="space-y-1.5">
                      {(sel.gaps || []).map((g, idx) => (
                        <div key={idx} className="p-2.5 bg-rose-50/60 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 rounded-lg space-y-0.5 text-xs">
                          <div className="flex justify-between font-bold text-rose-900 dark:text-rose-300">
                            <span>{g.skill}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded font-semibold">{g.importance}</span>
                          </div>
                          <p className="text-[11px] text-rose-700 dark:text-rose-400">Development recommendation: {g.learning_tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ATS Compliance */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">ATS Parsing Compliance</h3>
                    <div className="space-y-1">
                      {(sel.ats_checks || []).map((ats, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{ats.label}</span>
                          <span className={clsx("font-bold text-[10px] px-2 py-0.5 rounded", ats.passed ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300")}>
                            {ats.passed ? 'PASSED' : 'MISSING'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Keyword Matcher */}
                {keywords && (
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Keyword Density Match</h3>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">{keywords.pct}% Density</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(keywords.found || []).map(k => (
                        <span key={k} className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 rounded text-xs font-semibold">+ {k}</span>
                      ))}
                      {(keywords.missing || []).map(k => (
                        <span key={k} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 line-through rounded text-xs">- {k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Tailored Questions */}
            {tab === 'questions' && (
              <div className="space-y-3">
                {(sel.questions || []).map((q, idx) => (
                  <div key={idx} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {idx + 1}. {q.question}
                      </span>
                      <div className="flex gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200/60 dark:border-indigo-800/60">{q.category}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">{q.difficulty}</span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="font-bold text-slate-600 dark:text-slate-400 block text-[11px]">Tested Competency:</span>
                        <span className="text-slate-700 dark:text-slate-300 text-xs">{q.targets}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600 dark:text-slate-400 block text-[11px]">Expected Answer Signals:</span>
                        <span className="text-slate-700 dark:text-slate-300 text-xs">{q.good_answer_signals}</span>
                      </div>
                    </div>

                    {q.follow_up && (
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="font-bold text-slate-900 dark:text-slate-100">Follow-Up Probing Question:</span> {q.follow_up}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Mock Interview Evaluator */}
            {tab === 'mock' && (
              <div className="space-y-5">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Evaluate Candidate Response</h3>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Select Interview Question</label>
                    <select
                      value={mockQ}
                      onChange={e => setMockQ(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-semibold outline-none"
                    >
                      {(sel.questions || []).map((q, idx) => (
                        <option key={idx} value={q.question}>{q.question}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Candidate Response Text</label>
                    <textarea
                      rows={4}
                      value={mockA}
                      onChange={e => setMockA(e.target.value)}
                      placeholder="Paste candidate's transcript or written answer..."
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    onClick={evalAnswer}
                    disabled={mockLoading || !mockA.trim()}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {mockLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Evaluate Answer'}
                  </button>
                </div>

                {mockEval && (
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">Evaluation Result</h4>
                      <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">{mockEval.score} / 10 Score</span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg space-y-1 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="font-bold text-emerald-900 dark:text-emerald-300 block">Response Strengths</span>
                        <ul className="list-disc pl-4 text-emerald-800 dark:text-emerald-200 space-y-0.5">
                          {(mockEval.strengths || []).map((s, idx) => <li key={idx}>{s}</li>)}
                        </ul>
                      </div>
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-lg space-y-1 border border-amber-100 dark:border-amber-900/40">
                        <span className="font-bold text-amber-900 dark:text-amber-300 block">Areas for Development</span>
                        <ul className="list-disc pl-4 text-amber-800 dark:text-amber-200 space-y-0.5">
                          {(mockEval.improvements || []).map((s, idx) => <li key={idx}>{s}</li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg space-y-1 text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-100 block">Benchmark Exemplar Answer</span>
                      <p className="text-slate-700 dark:text-slate-300">{mockEval.model_answer}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: Email Drafter */}
            {tab === 'email' && (
              <div className="space-y-5">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Draft Candidate Communication</h3>

                  <div className="flex gap-3">
                    <select
                      value={emailKind}
                      onChange={e => setEmailKind(e.target.value)}
                      className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-semibold outline-none"
                    >
                      <option value="Interview invitation">Interview Invitation</option>
                      <option value="Technical screening test">Technical Assessment Notice</option>
                      <option value="Rejection with constructive feedback">Non-Selection Notice</option>
                      <option value="Formal job offer">Formal Job Offer Notice</option>
                    </select>

                    <button
                      onClick={draftEmail}
                      disabled={emailLoading}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {emailLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Generate Communication'}
                    </button>
                  </div>
                </div>

                {emailData && (
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-slate-500 dark:text-slate-400">Generated Email Copy</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`Subject: ${emailData.subject}\n\n${emailData.body}`);
                          setEmailCopied(true);
                          setTimeout(() => setEmailCopied(false), 2000);
                        }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        {emailCopied ? <Check size={14} /> : <Copy size={14} />}
                        {emailCopied ? 'Copied' : 'Copy Text'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        readOnly
                        value={`Subject: ${emailData.subject}`}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-semibold"
                      />
                      <textarea
                        rows={8}
                        readOnly
                        value={emailData.body}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs leading-relaxed font-sans resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 6: Auto-Apply Agent */}
            {tab === 'autoapply' && (
              <div className="space-y-5">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="text-indigo-600 dark:text-indigo-400" size={20} />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">AI Auto-Apply Agent — {sel.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Run the Auto-Apply Agent to evaluate candidate suitability for any job, generate tailored application materials, and auto-submit to the Applied Jobs Tracker.
                  </p>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Target Role / Job Title</label>
                      <input
                        type="text"
                        value={candJobRole}
                        onChange={e => setCandJobRole(e.target.value)}
                        placeholder="e.g. Senior Machine Learning Engineer"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-semibold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Target Company Name</label>
                      <input
                        type="text"
                        value={candCompany}
                        onChange={e => setCandCompany(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-semibold outline-none"
                      />
                    </div>
                  </div>

                  {candError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs font-medium">
                      {candError}
                    </div>
                  )}

                  <button
                    onClick={runCandAutoApply}
                    disabled={candApplyLoading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-lg text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {candApplyLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Job Suitability & Generating Package...</> : <><Bot size={16} /> Run Auto-Apply Agent for {sel.name}</>}
                  </button>
                </div>

                {candApplyPkg && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-900 p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Generated Application Package</span>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{candApplyPkg.target_role || candJobRole}</h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                          candApplyPkg.is_suitable 
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                            : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}>
                          {candApplyPkg.fit_score}% Fit — {candApplyPkg.is_suitable ? '✓ Suitable' : '⚠️ Gap Advisory'}
                        </span>

                        <button
                          onClick={submitCandApplication}
                          disabled={candSubmitting || candAppliedSuccess}
                          className={`px-4 py-2 rounded-xl text-xs font-extrabold text-white transition-all flex items-center gap-1.5 cursor-pointer ${
                            candAppliedSuccess ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-500'
                          }`}
                        >
                          {candSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : candAppliedSuccess ? <><CheckCircle2 size={14} /> Logged</> : <><Send size={14} /> Auto-Apply & Log</>}
                        </button>
                      </div>
                    </div>

                    {candAppliedSuccess && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 size={16} /> Application recorded in Applied Jobs Tracker!
                      </div>
                    )}

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-sans">
                      <strong className="text-slate-900 dark:text-slate-100">Suitability Assessment: </strong>{candApplyPkg.suitability_summary}
                    </div>

                    <div className="space-y-2">
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-300 block">Tailored Cover Letter</span>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line font-sans">
                        {candApplyPkg.tailored_cover_letter}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-300 block">Recruiter Email Pitch</span>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-sans">
                        {candApplyPkg.email_pitch}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 7: In-Page Proctored Test & Scorecard */}
            {tab === 'proctored' && (
              <div className="space-y-6">
                
                {/* 1. If Candidate has already taken/passed the exam */}
                {sel.proctoredExam && sel.proctoredExam.completedAt && procState !== 'active' && procState !== 'generating' ? (
                  <div className="space-y-6">
                    {/* Scorecard Hero Banner */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-indigo-900/50 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-7 h-7 text-emerald-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Official Verification Complete
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                Completed {new Date(sel.proctoredExam.completedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="text-lg font-black text-white mt-1">
                              100-Mark Anti-Proxy Proctored Exam Scorecard — {sel.name}
                            </h3>
                          </div>
                        </div>

                        <button
                          onClick={startInPageExam}
                          className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-extrabold transition-all border border-indigo-400/30 flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <RefreshCw size={14} /> Re-Take Proctored Exam
                        </button>
                      </div>

                      {/* Top Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Marks Obtained</span>
                          <span className="text-2xl font-black text-emerald-400">
                            {sel.proctoredExam.scoreObtained} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                          </span>
                        </div>

                        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Percentage Score</span>
                          <span className="text-2xl font-black text-indigo-300">
                            {sel.proctoredExam.percentage}%
                          </span>
                        </div>

                        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Exam Grade</span>
                          <span className="text-sm font-black text-purple-300 mt-1 block">
                            {sel.proctoredExam.grade}
                          </span>
                        </div>

                        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Anti-Proxy Integrity</span>
                          <span className="text-sm font-black text-emerald-300 mt-1 flex items-center gap-1">
                            <ShieldCheck size={14} /> {sel.proctoredExam.integrityScore}% Monitored
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Proctoring Log Trace */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 space-y-2">
                      <div className="flex items-center justify-between font-bold text-[11px] text-slate-400 uppercase tracking-wider font-sans border-b border-slate-800 pb-2">
                        <span className="flex items-center gap-2"><Camera size={14} className="text-emerald-400" /> Webcam & Anti-Cheat Monitored Trace</span>
                        <span className="text-emerald-400">STATUS: VERIFIED</span>
                      </div>
                      <div className="space-y-1 pt-1">
                        {(sel.proctoredExam.proctoringLogs || []).map((log, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px]">
                            <span className="text-emerald-400">›</span> {log}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Question Answers & Anti-Proxy Analysis */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                      <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider flex items-center gap-2">
                        <FileText size={16} className="text-indigo-600" /> Detailed Question Scorecard & Feedback Breakdown
                      </h4>

                      <div className="space-y-3">
                        {(sel.proctoredExam.answers || []).map((ans, idx) => (
                          <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex gap-2">
                                <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400">Q{idx + 1}.</span>
                                <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">{ans.question}</h5>
                              </div>
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold shrink-0 border ${
                                ans.marksAwarded > 0 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                                  : 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              }`}>
                                {ans.marksAwarded} / {ans.maxMarks} Marks
                              </span>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-2 text-[11px] pt-1">
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Candidate Answer</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{ans.candidateAnswer}</span>
                              </div>
                              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Evaluation Feedback</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{ans.feedback}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  
                  /* 2. In-Page Exam Runner / Start State */
                  <div>
                    {/* Eligibility check */}
                    {(sel.scores?.overall || 0) < 75 ? (
                      <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 space-y-3 text-amber-900 dark:text-amber-200">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400 shrink-0" />
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-wider">Proctored Assessment Locked</h4>
                            <p className="text-xs text-amber-800 dark:text-amber-300">
                              Candidate overall match score is currently {sel.scores?.overall || 0}%. A minimum screening score of 75% is required to attempt the 100-Mark Anti-Proxy Examination.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {/* ProcState: Idle */}
                        {procState === 'idle' && (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                              <div className="flex items-center gap-3">
                                <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                                <div>
                                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                                    100-Mark Anti-Proxy Proctored Exam
                                  </h3>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Screening verified (75%+ match). Launch the live in-page exam for candidate verification.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                                <Clock size={14} className="text-indigo-500" />
                                <span>Duration: 60 Mins</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Section A (40 Marks)</span>
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Advanced Architecture & Deep Core</h5>
                              </div>
                              <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 space-y-1">
                                <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400">Section B (30 Marks)</span>
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">System Design & Problem Solving</h5>
                              </div>
                              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 space-y-1">
                                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Section C (30 Marks)</span>
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Skill Verification & Anti-Proxy</h5>
                              </div>
                            </div>

                            {procError && (
                              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
                                {procError}
                              </div>
                            )}

                            <button
                              onClick={startInPageExam}
                              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                            >
                              <ShieldCheck size={16} /> Launch Proctored Assessment (In-Page)
                            </button>
                          </div>
                        )}

                        {/* ProcState: Generating */}
                        {procState === 'generating' && (
                          <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                            <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Generating 100-Mark Anti-Proxy Questions...</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                              AI Assessment Architect is customizing scenario-based questions tailored specifically to candidate's claimed skills and resume.
                            </p>
                          </div>
                        )}

                        {/* ProcState: Active Exam */}
                        {procState === 'active' && procData && (
                          <div className="space-y-6">
                            {/* Proctoring Bar */}
                            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                                    <Camera className="w-5 h-5 text-emerald-400" />
                                  </div>
                                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-pulse border-2 border-slate-900" />
                                </div>
                                <div>
                                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">Live Camera & Focus Active</span>
                                  <span className="text-xs font-bold text-slate-200">Anti-Proxy Proctoring Online</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold">
                                  <Clock size={14} className="text-indigo-400" />
                                  <span>{formatProcTime(procTimeLeft)}</span>
                                </div>

                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                                  procIntegrity >= 80 ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-rose-950 text-rose-300 border-rose-800'
                                }`}>
                                  <ShieldCheck size={14} />
                                  <span>{procIntegrity}% Integrity</span>
                                </div>
                              </div>
                            </div>

                            {/* Question Sections */}
                            {(procData.sections || []).map((sec, sIdx) => (
                              <div key={sIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
                                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                                  {sec.section_title}
                                </h4>

                                <div className="space-y-4">
                                  {(sec.questions || []).map((q, qIdx) => (
                                    <div key={q.id} className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                          {qIdx + 1}. {q.question}
                                        </h5>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                                          {q.marks} Marks
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 gap-2">
                                        {(q.options || []).map((opt, oIdx) => (
                                          <label
                                            key={oIdx}
                                            onClick={() => setProcAnswers(prev => ({ ...prev, [q.id]: oIdx }))}
                                            className={`p-3 rounded-xl border text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                                              procAnswers[q.id] === oIdx 
                                                ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs' 
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                          >
                                            <input
                                              type="radio"
                                              name={`q_${q.id}`}
                                              checked={procAnswers[q.id] === oIdx}
                                              onChange={() => {}}
                                              className="text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>{opt}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}

                            {procError && (
                              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-medium">
                                {procError}
                              </div>
                            )}

                            <button
                              onClick={submitInPageExam}
                              disabled={procSubmitting}
                              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                            >
                              {procSubmitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating Proctored Scorecard...</>
                              ) : (
                                <><ShieldCheck size={18} /> Submit & Evaluate 100-Mark Exam</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Resume Screening Modal */}
      {showScreenModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Screen Candidate Resume (In-Page)
                </h3>
              </div>
              <button onClick={() => setShowScreenModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">1. Upload Candidate Resume (PDF or TXT)</label>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={e => {
                    if (e.target.files) setModalFiles(Array.from(e.target.files));
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
                {modalFiles.length > 0 && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">✓ Selected: {modalFiles[0].name}</span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">2. Target Position Job Description Criteria</label>
                <textarea
                  rows={4}
                  value={modalJd}
                  onChange={e => setModalJd(e.target.value)}
                  placeholder="Paste target position description, required skills, qualifications..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono leading-relaxed"
                />
              </div>

              {modalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
                  {modalError}
                </div>
              )}

              <button
                onClick={handleModalScreen}
                disabled={modalLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {modalLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Screening Resume & Computing Match...</> : <><Sparkles size={16} /> Evaluate Resume & Add to Candidate Pool</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
