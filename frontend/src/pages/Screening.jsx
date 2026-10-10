import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, Loader2, 
  EyeOff, Sliders, X, ChevronRight, Target, ShieldCheck, Play, Sparkles, UserCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import HeroBanner from '../components/HeroBanner';

export default function Screening() {
  const { user } = useAuth();
  const isCandidate = user?.role === 'candidate';

  const [files, setFiles] = useState([]);

  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [jdCheck, setJdCheck] = useState(null);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced screening configuration
  const [numQuestions, setNumQuestions] = useState(8);
  const [focus, setFocus] = useState('Balanced');
  const [difficulty, setDifficulty] = useState('Mixed');
  const [blind, setBlind] = useState(false);
  const [weights, setWeights] = useState({
    skills: 40,
    experience: 25,
    education: 10,
    projects: 15,
    communication: 10
  });

  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('talentlens_settings');
    if (stored) {
      try {
        const s = JSON.parse(stored);
        if (s.questionCount) setNumQuestions(s.questionCount);
        if (s.focus) setFocus(s.focus);
        if (s.difficulty) setDifficulty(s.difficulty);
        if (typeof s.blindScreening === 'boolean') setBlind(s.blindScreening);
        if (s.weights) setWeights(s.weights);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const handleJdCheck = async (text) => {
    setJd(text);
    if (text.trim().length > 30) {
      try {
        const res = await api.post('/jd-check', { jd: text });
        setJdCheck(res.data);
      } catch (err) {
        console.error(err);
      }
    } else {
      setJdCheck(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  const handleWeightChange = (key, val) => {
    setWeights(prev => ({ ...prev, [key]: Number(val) }));
  };

  const handleAnalyze = async () => {
    if (!files.length) {
      setError('Please select or upload at least one candidate resume file (PDF or TXT).');
      return;
    }
    if (!jd.trim()) {
      setError('Please enter or paste the target position job description.');
      return;
    }

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('jd', jd);
    formData.append('n_q', String(numQuestions));
    formData.append('focus', focus);
    formData.append('difficulty', difficulty);
    formData.append('blind', String(blind));
    formData.append('weights', JSON.stringify(weights));

    files.forEach(f => formData.append('resumes', f));

    try {
      setProgress(`Analyzing ${files.length} resume(s) via AI engine...`);
      await api.post('/screen', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      navigate('/candidates');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Error screening resumes. Please check backend connection.');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Header */}
      <HeroBanner
        badge={isCandidate ? "Candidate ATS Portal" : "Enterprise HR Screening"}
        title={isCandidate ? "My Resume ATS & Skill Match Analyzer" : "Candidate Resume Screening & AI Scoring Engine"}
        subtitle={
          isCandidate 
            ? "Upload your resume alongside any target Job Description to calculate your ATS Match Score, discover matched skills & gaps, and get AI resume optimization tips."
            : "Screen candidate resumes against target job criteria, calculate weighted scores, audit for bias, and generate structured interview scorecards."
        }
        icon={isCandidate ? Sparkles : Target}
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Step 1: Upload Resumes */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-50 dark:bg-indigo-950 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 font-bold text-xs">Step 1</div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {isCandidate ? "Upload Your Resume" : "Upload Candidate Resumes"}
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{files.length} file(s) selected</span>
            </div>

            <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl p-7 flex flex-col items-center justify-center cursor-pointer transition-colors">
              <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-2" />
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">
                {isCandidate ? "Click to upload your resume (PDF or TXT)" : "Click to upload candidate resumes (PDF or TXT)"}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {isCandidate ? "Single resume file analysis" : "Select multiple resumes at once"}
              </span>
              <input type="file" multiple={!isCandidate} accept=".pdf,.txt" className="hidden" onChange={handleFileChange} />
            </label>


            {files.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-44 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={f.name + i} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 font-medium">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <span className="text-[10px] text-slate-400">({Math.round(f.size / 1024)} KB)</span>
                    </div>
                    <button onClick={() => removeFile(f.name)} className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            Supports structured PDF text extraction and plain text formats.
          </div>
        </div>

        {/* Step 2: Job Description */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-700 dark:text-slate-300 font-bold text-xs">Step 2</div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Position Specification</h2>
            </div>
            {jdCheck && (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{jdCheck.words} words</span>
            )}
          </div>

          <textarea
            className="w-full h-40 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all text-xs font-sans leading-relaxed"
            placeholder="Paste target position description, key requirements, and qualifications..."
            value={jd}
            onChange={e => handleJdCheck(e.target.value)}
          />

          {/* Realtime JD Bias Check */}
          {jdCheck && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              {jdCheck.flags?.length > 0 ? (
                <div className="text-amber-800 dark:text-amber-300 flex items-start gap-2 font-medium">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-bold">Potentially non-inclusive phrasing:</span>{' '}
                    {jdCheck.flags.map(f => `'${f.word}' (suggested: ${f.suggestion})`).join(', ')}
                  </div>
                </div>
              ) : (
                <div className="text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" /> Inclusive wording verified (no biased phrasing detected).
                </div>
              )}
              <div className="text-slate-500 dark:text-slate-400 flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                <span>Requires max {jdCheck.max_years}y experience</span>
                <span>{jdCheck.must_have_lines} mandatory requirement lines</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Configuration Drawer */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span>Advanced Evaluation Configuration</span>
            {blind && <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Blind Screening Active</span>}
          </div>
          <ChevronRight size={16} className={`transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-5">
            <div className="grid md:grid-cols-3 gap-5">
              {/* Question Count */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Question Count</label>
                <select
                  value={numQuestions}
                  onChange={e => setNumQuestions(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={5}>5 Questions (Summary)</option>
                  <option value={8}>8 Questions (Standard)</option>
                  <option value={10}>10 Questions (Detailed)</option>
                  <option value={12}>12 Questions (Comprehensive)</option>
                </select>
              </div>

              {/* Focus Area */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Evaluation Focus</label>
                <select
                  value={focus}
                  onChange={e => setFocus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Balanced">Balanced (Technical + HR)</option>
                  <option value="Technical">Deep Technical & Engineering</option>
                  <option value="System Design">Architecture & Systems</option>
                  <option value="Behavioral">Behavioral & Leadership</option>
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Question Difficulty</label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Mixed">Mixed Level</option>
                  <option value="Easy">Junior Level</option>
                  <option value="Medium">Mid Level</option>
                  <option value="Hard">Senior / Principal Level</option>
                </select>
              </div>
            </div>

            {/* Blind Screening Toggle */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <EyeOff className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Blind Resume Protocol</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Mask candidate PII (names, contact info, gendered terms) prior to AI analysis.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={blind}
                onChange={e => setBlind(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* Scoring Weight Sliders */}
            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Dimension Weights (Total: {totalWeight}%)</span>
                {totalWeight !== 100 && <span className="text-amber-600 text-[11px] font-medium">(Auto-normalized)</span>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(weights).map(([k, val]) => (
                  <div key={k} className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between text-[11px] font-semibold capitalize text-slate-700 dark:text-slate-300 mb-1">
                      <span>{k}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{val}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="5"
                      value={val}
                      onChange={e => handleWeightChange(k, e.target.value)}
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Submit Action Button */}
      <button
        onClick={handleAnalyze}
        disabled={!jd.trim() || files.length === 0 || loading}
        className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
          !jd.trim() || files.length === 0 || loading
            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{progress}</span>
          </>
        ) : (
          <>
            <Play size={16} fill="currentColor" />
            <span>Analyze Candidate Profiles ({files.length})</span>
          </>
        )}
      </button>
    </motion.div>
  );
}
