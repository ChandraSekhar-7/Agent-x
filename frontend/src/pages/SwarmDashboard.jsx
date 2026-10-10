import { useState, useEffect } from 'react';
import api from '../api';
import { 
  Bot, ShieldCheck, Compass, Search, Sparkles, Send, Loader2, CheckCircle2, 
  Terminal, UserCheck, Flame, ExternalLink, ArrowRight, Copy, Check, Play, Pause, RefreshCw, Zap, Clock, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroBanner from '../components/HeroBanner';

const AGENTS = [
  {
    id: "ScreeningAgent",
    name: "ScreeningAgent",
    role: "Candidate Evaluation & Ranking",
    desc: "Analyzes candidate resume against target roles, computes weighted scores, and extracts key skills.",
    icon: ShieldCheck,
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: "MarketSearchAgent",
    name: "MarketSearchAgent",
    role: "Live Job Market Intelligence",
    desc: "Queries real-time live job postings in India & Global markets across LinkedIn, Indeed, Naukri & Google Jobs.",
    icon: Search,
    color: "from-emerald-600 to-teal-600"
  },
  {
    id: "RoadmapAgent",
    name: "RoadmapAgent",
    role: "12-Week Career Growth Coach",
    desc: "Constructs 12-week upskilling roadmaps with mini-projects to bridge candidate-role gaps.",
    icon: Compass,
    color: "from-purple-600 to-pink-600"
  },
  {
    id: "ResumeBoosterAgent",
    name: "ResumeBoosterAgent",
    role: "Executive Resume Copywriter",
    desc: "Rewrites bullet points with strong action verbs and metrics, crafts LinkedIn headlines and tailored summaries.",
    icon: Sparkles,
    color: "from-amber-500 to-orange-600"
  },
  {
    id: "AutoApplyPackageAgent",
    name: "AutoApplyPackageAgent",
    role: "Cover Letter & Package Tailor",
    desc: "Formulates tailored cover letters, recruiter email pitches, and top ATS keyword checklists.",
    icon: Bot,
    color: "from-indigo-600 to-purple-600"
  },
  {
    id: "BrowserExecutionAgent",
    name: "BrowserExecutionAgent",
    role: "Autonomous Playwright Browser Submission",
    desc: "Executes automated Playwright Chrome browser submissions and registers applications in MongoDB Tracker.",
    icon: Send,
    color: "from-rose-600 to-pink-600"
  }
];

export default function SwarmDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [selId, setSelId] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('Senior Full Stack Engineer');
  const [location, setLocation] = useState('India');
  const [company, setCompany] = useState('Tech Enterprise');

  // Automation Pipeline states
  const [triggerMode, setTriggerMode] = useState('ondemand'); // 'ondemand', 'cron', 'upload'
  const [cronInterval, setCronInterval] = useState('6h'); // '1h', '6h', '24h'
  const [isPaused, setIsPaused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [activeAgentIndex, setActiveAgentIndex] = useState(-1);
  const [swarmResult, setSwarmResult] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('logs');
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/candidates');
      setCandidates(res.data);
      if (res.data.length > 0) {
        setSelId(res.data[0]._id);
        setResumeText(res.data[0].resumeText || '');
        setTargetRole(res.data[0].role || 'Senior Full Stack Engineer');
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
      if (c.role) setTargetRole(c.role);
    }
  };

  const runSwarm = async () => {
    if (!resumeText.trim()) {
      setError('Please select a candidate or enter resume text.');
      return;
    }
    setLoading(true);
    setIsPaused(false);
    setError('');
    setSwarmResult(null);
    setActiveAgentIndex(0);

    // Simulate agent activation steps for visual feedback
    const interval = setInterval(() => {
      setActiveAgentIndex(prev => {
        if (prev < AGENTS.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1200);

    try {
      const res = await api.post('/multi-agents/orchestrate', {
        resumeText: resumeText,
        role: targetRole,
        location: location,
        company: company
      });

      clearInterval(interval);
      setActiveAgentIndex(AGENTS.length - 1);
      setSwarmResult(res.data);
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setError(err.response?.data?.error || 'Multi-Agent Swarm Orchestration failed.');
    } finally {
      setLoading(false);
    }
  };

  const resetPipeline = () => {
    setSwarmResult(null);
    setActiveAgentIndex(-1);
    setLoading(false);
    setIsPaused(false);
    setError('');
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Banner */}
      <HeroBanner
        badge="6 Multi-Agent Autonomous Swarm System"
        title="Collaborative Multi-Agent AI Workflow Engine"
        subtitle="Orchestrates 6 specialized autonomous agents in real time: Screening, Market Search, Career Roadmap, Resume Boosting, Application Package Tailoring, and Playwright Browser Submission."
        icon={Bot}
      />

      {/* Visual Workflow Pipeline Flowchart */}
      <div className="bg-slate-900 text-white rounded-3xl p-7 space-y-6 shadow-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono font-extrabold uppercase text-emerald-400 tracking-wider block">Visual Automation Pipeline</span>
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <Zap size={18} className="text-amber-400" /> 6-Agent Sequential Workflow Graph
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runSwarm}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play size={14} /> Run Pipeline</>}
            </button>
            <button
              onClick={() => setIsPaused(!isPaused)}
              disabled={!loading}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Pause size={14} /> {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={resetPipeline}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>

        {/* Pipeline Nodes Flowchart */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
          {AGENTS.map((agent, idx) => {
            const IconComponent = agent.icon;
            const isActive = loading && activeAgentIndex === idx;
            const isDone = swarmResult && (activeAgentIndex > idx || !loading);

            return (
              <div key={agent.id} className="relative flex flex-col items-center text-center">
                <div className={`w-full p-3.5 rounded-2xl border transition-all space-y-2 ${
                  isActive
                    ? 'border-emerald-400 bg-emerald-950/80 ring-2 ring-emerald-400/40 animate-pulse'
                    : isDone
                    ? 'border-indigo-500/80 bg-slate-800/90 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400">Step {idx + 1}</span>
                    <IconComponent size={14} className={isActive ? 'text-emerald-400' : isDone ? 'text-indigo-400' : 'text-slate-500'} />
                  </div>
                  <div className="font-extrabold text-xs text-white truncate">{agent.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{agent.role.split(' ')[0]}</div>
                </div>

                {idx < AGENTS.length - 1 && (
                  <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight size={14} className={activeAgentIndex > idx ? 'text-emerald-400' : 'text-slate-700'} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Automation Trigger Rules */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-indigo-400" />
            <span className="font-bold text-slate-300">Automation Trigger Mode:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ondemand', label: '⚡ On-Demand Manual', icon: Zap },
              { id: 'cron', label: '⏱️ Scheduled Auto-Cron (Every 6h)', icon: Clock },
              { id: 'upload', label: '📄 Auto-Trigger on PDF Upload', icon: FileText }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setTriggerMode(m.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                  triggerMode === m.id
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 6 Specialized Agents Architecture Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Bot className="text-indigo-600 dark:text-indigo-400" size={22} />
          <span>Active 6 Multi-Agent Swarm Roster</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          {AGENTS.map((agent, idx) => {
            const IconComponent = agent.icon;
            const isActive = loading && activeAgentIndex === idx;
            const isCompleted = swarmResult && (activeAgentIndex > idx || !loading);

            return (
              <motion.div
                key={agent.id}
                whileHover={{ y: -2 }}
                className={`p-5 rounded-2xl border transition-all space-y-3 relative overflow-hidden ${
                  isActive 
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/60 ring-2 ring-indigo-500/30' 
                    : isCompleted && swarmResult
                    ? 'border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl text-white bg-gradient-to-r ${agent.color}`}>
                    <IconComponent size={18} />
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase border ${
                    isActive 
                      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 animate-pulse'
                      : isCompleted && swarmResult
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                    {isActive ? '⚡ Active' : isCompleted && swarmResult ? '✓ Done' : `Agent ${idx + 1}`}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{agent.name}</h3>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">{agent.role}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{agent.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Swarm Control Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-7 space-y-6">
        <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Terminal size={20} className="text-indigo-600 dark:text-indigo-400" />
          <span>Swarm Trigger & Payload Configuration</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Candidate</label>
            <select
              value={selId}
              onChange={e => handleCandidateChange(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {candidates.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name} — {c.role} ({c.scores?.overall || 0}/100)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Role Title</label>
            <input
              type="text"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Full Stack Engineer"
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. India, Bangalore, Remote"
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold">
            {error}
          </div>
        )}

        <button
          onClick={runSwarm}
          disabled={loading || !resumeText.trim()}
          className={`w-full py-4 rounded-xl font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            loading || !resumeText.trim()
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 text-white hover:scale-[1.01] hover:shadow-indigo-500/30'
          }`}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Orchestrating 6 Autonomous Agents Swarm...</>
          ) : (
            <><Bot size={20} /> 🚀 Execute 6 Multi-Agent Swarm Orchestration</>
          )}
        </button>
      </div>

      {/* Live Results & Agent Outputs */}
      {swarmResult && (
        <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-7 space-y-6">
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
            {[
              { id: 'logs', label: 'Console Execution Logs', icon: Terminal },
              { id: 'screening', label: '1. Screening', icon: ShieldCheck },
              { id: 'market', label: '2. Live Jobs', icon: Search },
              { id: 'roadmap', label: '3. Roadmap', icon: Compass },
              { id: 'booster', label: '4. Resume Booster', icon: Sparkles },
              { id: 'package', label: '5 & 6. Package & Execution', icon: Send }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-4 text-xs font-extrabold border-b-2 flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          {/* Console Execution Logs */}
          {activeTab === 'logs' && (
            <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-emerald-400 font-bold flex items-center gap-2"><CheckCircle2 size={16} /> 6-Agent Swarm Orchestration Complete</span>
                <span className="text-[10px] text-slate-400">{swarmResult.agents_executed?.length} Agents Executed</span>
              </div>

              <div className="space-y-2 pt-1 text-slate-300">
                {(swarmResult.swarm_logs || []).map((logLine, lIdx) => (
                  <div key={lIdx} className="leading-relaxed">
                    {logLine}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screening Results */}
          {activeTab === 'screening' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex justify-between items-center">
                <div>
                  <span className="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm block">Candidate Match Score</span>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">Role: {swarmResult.target_role}</p>
                </div>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {swarmResult.screening?.scores?.overall || 85}/100
                </span>
              </div>

              <p className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                {swarmResult.screening?.summary}
              </p>
            </div>
          )}

          {/* Live Market Jobs */}
          {activeTab === 'market' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Search size={16} className="text-emerald-500" /> Real-Time Live Job Postings ({swarmResult.market_jobs?.jobs?.length || 0})
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                {(swarmResult.market_jobs?.jobs || []).map((job, jIdx) => (
                  <div key={jIdx} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">{job.title}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-bold text-[10px]">{job.posted_ago}</span>
                    </div>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold block">{job.company} • {job.location}</span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-2">{job.job_description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roadmap */}
          {activeTab === 'roadmap' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Compass size={16} className="text-purple-500" /> 12-Week Upskilling Roadmap
              </h3>
              <div className="space-y-3">
                {(swarmResult.roadmap?.phases || []).map((phase, pIdx) => (
                  <div key={pIdx} className="p-4 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-2xl space-y-2">
                    <span className="font-extrabold text-purple-900 dark:text-purple-200">{phase.period} — {phase.focus}</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                      {(phase.tasks || []).map((t, tidx) => <li key={tidx}>{t}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resume Booster */}
          {activeTab === 'booster' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-2">
                <span className="font-extrabold text-amber-900 dark:text-amber-200 block">LinkedIn Headline</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{swarmResult.booster?.linkedin_headline}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 block">Tailored Executive Summary</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{swarmResult.booster?.tailored_summary}</p>
              </div>
            </div>
          )}

          {/* Application Package & Playwright Execution */}
          {activeTab === 'package' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm">Tailored Agent Cover Letter</span>
                  <button
                    onClick={() => copyToClipboard(swarmResult.application_package?.tailored_cover_letter, 'pkgCover')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'pkgCover' ? <Check size={12} /> : <Copy size={12} />} Copy Cover Letter
                  </button>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900 text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                  {swarmResult.application_package?.tailored_cover_letter}
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400 font-bold flex items-center gap-2"><Send size={14} /> Playwright Execution Agent Payload</span>
                  <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-indigo-300">{swarmResult.browser_execution?.confirmation_id}</span>
                </div>
                <ul className="space-y-1 text-slate-300 text-[11px] pl-2">
                  {(swarmResult.browser_execution?.action_logs || []).map((log, idx) => (
                    <li key={idx} className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-400" /> {log}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
