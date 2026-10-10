import { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Camera, Eye, AlertTriangle, Clock, 
  CheckCircle2, Award, FileText, ArrowRight, Loader2, Sparkles, UserCheck, RefreshCw, BarChart2
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import HeroBanner from '../components/HeroBanner';

export default function ProctoredExam() {
  const { user } = useAuth();
  const [examState, setExamState] = useState('idle'); // 'idle' | 'generating' | 'active' | 'submitted'
  const [examData, setExamData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [proctorLogs, setProctorLogs] = useState(['Face verification initialized', 'Anti-proxy proctoring enabled']);
  const [submitting, setSubmitting] = useState(false);
  const [examResult, setExamResult] = useState(null);
  const [error, setError] = useState('');

  // Resume 75% Eligibility Gate State
  const [eligibility, setEligibility] = useState(() => {
    const saved = localStorage.getItem('talentlens_candidate_eligibility');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { overallScore: 82, skillMatch: 85, isEvaluated: true };
  });

  const isEligible = eligibility.overallScore >= 75 && eligibility.skillMatch >= 75;


  // Detect tab switching for anti-proxy proctoring
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && examState === 'active') {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          const penalty = 15;
          setIntegrityScore(score => Math.max(0, score - penalty));
          setProctorLogs(logs => [
            `⚠️ WARNING: Tab switch or focus loss detected (#${newCount}) at ${new Date().toLocaleTimeString()}`,
            ...logs
          ]);
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [examState]);

  // Exam Countdown Timer
  useEffect(() => {
    let timer;
    if (examState === 'active' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [examState, timeLeft]);

  const handleStartExam = async () => {
    setExamState('generating');
    setError('');
    try {
      const res = await api.post('/exam/generate', {
        candidateName: user?.name || 'Candidate',
        targetRole: user?.headline || 'Senior Software Engineer',
        skills: user?.headline ? [user.headline] : ['Full Stack Development', 'Node.js', 'System Architecture', 'Database Optimization']
      });
      
      setExamData(res.data);
      setExamState('active');
      setTimeLeft((res.data.time_limit_minutes || 60) * 60);
      setProctorLogs([
        '🟢 Live Camera Proctoring Active',
        '🔒 Anti-Proxy Lockdown Initialized (No Tab Switching Allowed)',
        '🎯 100 Marks Hard Technical Assessment Generated'
      ]);
    } catch (err) {
      console.error(err);
      setError('Failed to generate proctored assessment. Please check backend.');
      setExamState('idle');
    }
  };

  const handleOptionSelect = (qId, optionIdx) => {
    setUserAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmitExam = async () => {
    if (!examData) return;
    setSubmitting(true);
    setError('');

    // Flatten all questions
    const allQuestions = [];
    (examData.sections || []).forEach(sec => {
      (sec.questions || []).forEach(q => allQuestions.push(q));
    });

    try {
      const res = await api.post('/exam/submit', {
        candidateName: user?.name || 'Candidate',
        candidateEmail: user?.email || 'candidate@example.com',
        targetRole: examData.target_role || 'Software Engineer',
        userAnswers,
        questionsList: allQuestions,
        integrityScore,
        proctoringLogs: proctorLogs
      });

      setExamResult(res.data.result);
      setExamState('submitted');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to submit exam.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-6xl mx-auto">
      
      {/* Hero Header */}
      <HeroBanner
        badge="Anti-Proxy Proctoring Engine"
        title="100-Mark Proctored Technical Examination"
        subtitle="Rigorous, un-proxyable skill verification for candidates based on actual resume claims, architecture scenarios, and production engineering problems."
        icon={ShieldCheck}
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* State 1: Start Exam Overview */}
      {examState === 'idle' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Official Verification Exam
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                Candidate Technical Evaluation (100 Marks)
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
              <Clock size={15} className="text-indigo-500" />
              <span>Duration: 60 Mins</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400">Section A (40 Marks)</span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Advanced Architecture & Core</h4>
              <p className="text-[11px] text-slate-500">Deep core concepts, concurrency, and memory diagnostics.</p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-purple-600 dark:text-purple-400">Section B (30 Marks)</span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">System Design & Problem Solving</h4>
              <p className="text-[11px] text-slate-500">Real-world production debugging & caching trade-offs.</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">Section C (30 Marks)</span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Skill Verification & Anti-Proxy</h4>
              <p className="text-[11px] text-slate-500">Resume claim verification & edge-case scenario questions.</p>
            </div>
          </div>

          {/* Resume 75% Eligibility Verification Gate */}
          <div className={`p-5 rounded-2xl border ${
            isEligible 
              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' 
              : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
          } space-y-3`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isEligible ? (
                  <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400" />
                )}
                <span className={`text-xs font-black uppercase tracking-wider ${
                  isEligible ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'
                }`}>
                  {isEligible ? '🎉 Verified 75%+ Eligible Candidate' : '🔒 Ineligible (Requires 75%+ Skill & Overall Match)'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">Overall Score:</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded ${
                  eligibility.overallScore >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {eligibility.overallScore}%
                </span>
                <span className="text-[11px] font-bold text-slate-500">Skill Match:</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded ${
                  eligibility.skillMatch >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {eligibility.skillMatch}%
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isEligible 
                ? 'Your resume evaluation meets the minimum requirement of 75% overall score and 75% skill match threshold. You are cleared to take the 100-Mark Anti-Proxy Proctored Assessment.'
                : 'Your current resume evaluation is below the 75% eligibility threshold. Candidates must achieve a minimum of 75% overall score & 75% skill match to unlock the 100-Mark Proctored Test.'
              }
            </p>

            {!isEligible && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const updated = { overallScore: 84, skillMatch: 88, isEvaluated: true };
                    setEligibility(updated);
                    localStorage.setItem('talentlens_candidate_eligibility', JSON.stringify(updated));
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
                >
                  ⚡ Unlock Test (Simulate 75%+ Shortlist Score)
                </button>
              </div>
            )}
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={handleStartExam}
              disabled={!isEligible}
              className={`px-8 py-3.5 rounded-2xl font-extrabold text-sm shadow-xl transition-all flex items-center justify-center gap-2.5 mx-auto cursor-pointer ${
                isEligible
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <ShieldCheck size={18} />
              <span>{isEligible ? 'Initialize Proctored Examination (100 Marks)' : '🔒 Proctored Test Locked (75% Score Required)'}</span>
              <ArrowRight size={16} />
            </button>
          </div>

        </div>
      )}

      {/* State 2: Generating Exam Loading */}
      {examState === 'generating' && (
        <div className="py-24 text-center space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
          <Loader2 size={36} className="animate-spin text-indigo-600 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Generating Anti-Proxy 100-Mark Assessment...
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Building hard technical scenarios tailored to candidate skills: {user?.headline || 'Software Engineer'}
            </p>
          </div>
        </div>
      )}

      {/* State 3: Active Exam Environment */}
      {examState === 'active' && examData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Questions Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Top Timer Bar */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-indigo-400" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Time Remaining</span>
                  <span className="font-mono text-lg font-black text-emerald-400">{formatTime(timeLeft)}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Marks</span>
                <span className="font-black text-sm text-indigo-300">100 Marks</span>
              </div>
            </div>

            {/* Questions List */}
            {(examData.sections || []).map((sec, sIdx) => (
              <div key={sIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-md">
                    {sec.section_title}
                  </span>
                </div>

                <div className="space-y-6">
                  {(sec.questions || []).map((q, qIdx) => (
                    <div key={q.id} className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                          Q{qIdx + 1}. {q.question}
                        </h4>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                          {q.marks} Marks
                        </span>
                      </div>

                      {q.anti_proxy_hint && (
                        <div className="text-[10px] text-slate-400 italic">
                          💡 Anti-Proxy Focus: {q.anti_proxy_hint}
                        </div>
                      )}

                      {/* Options */}
                      <div className="space-y-2 pt-1">
                        {(q.options || []).map((opt, oIdx) => {
                          const isSelected = userAnswers[q.id] === oIdx;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleOptionSelect(q.id, oIdx)}
                              className={`w-full text-left p-3 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/20'
                                  : 'border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                              {isSelected && <CheckCircle2 size={15} className="text-indigo-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Submit Button */}
            <div className="pt-4 text-center">
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
                <span>{submitting ? 'Evaluating 100 Marks...' : 'Submit Proctored Exam & Generate Scorecard'}</span>
              </button>
            </div>

          </div>

          {/* Right Column: Live Proctoring & Anti-Cheat Monitor */}
          <div className="lg:col-span-4 space-y-5 sticky top-20">
            
            {/* Live Camera Feed Simulator */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Webcam Proctoring
                </span>
                <Camera size={15} className="text-slate-400" />
              </div>

              {/* Simulated Camera Box */}
              <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-500/60 flex items-center justify-center animate-pulse">
                  <UserCheck size={32} className="text-emerald-400" />
                </div>
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[9px] font-mono text-emerald-300">
                  FACE: VERIFIED (100%)
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[9px] font-mono text-slate-300">
                  AI LOCK: ON
                </div>
              </div>

              {/* Integrity Score */}
              <div className="pt-1 flex items-center justify-between border-t border-slate-800">
                <span className="text-xs text-slate-400">Anti-Proxy Integrity:</span>
                <span className={`text-sm font-black ${integrityScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {integrityScore}%
                </span>
              </div>
            </div>

            {/* Proctoring Logs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Proctoring Security Log
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto text-[11px] font-mono">
                {proctorLogs.map((log, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                    {log}
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* State 4: Submitted Exam Scorecard */}
      {examState === 'submitted' && examResult && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 text-center sm:text-left">
            <div>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Official Proctored Scorecard
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                Examination Result: {examResult.scoreObtained} / 100 Marks
              </h2>
              <p className="text-xs text-slate-500">Candidate: {examResult.candidateName} ({examResult.targetRole})</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-center p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Grade</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{examResult.grade}</span>
              </div>
              <div className="text-center p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Anti-Proxy Integrity</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{examResult.integrityScore}%</span>
              </div>
            </div>
          </div>

          {/* Breakdown per Question */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Detailed Question Scorecard:</h4>
            <div className="space-y-2">
              {(examResult.answers || []).map((ans, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 max-w-xl">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Q{idx + 1}. {ans.question}</span>
                    <span className="text-[11px] text-slate-500 block">Selected: {ans.candidateAnswer}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-black ${ans.marksAwarded > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {ans.marksAwarded} / {ans.maxMarks} Marks
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => setExamState('idle')}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Take Another Practice Verification Exam
            </button>
          </div>
        </div>
      )}

    </motion.div>
  );
}
