import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, Cpu, Sliders, Shield, EyeOff, Save, RotateCcw, 
  CheckCircle2, Trash2, Building, Mail, Sparkles, FileText, Sun, Moon, Monitor
} from 'lucide-react';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import HeroBanner from '../components/HeroBanner';

const DEFAULT_SETTINGS = {
  orgName: 'Talent Acquisition Team',
  recruiterSignoff: 'Talent Acquisition Team',
  defaultModel: 'gemini-3.6-flash',
  questionCount: 8,
  focus: 'Balanced',
  difficulty: 'Mixed',
  temperature: 0.2,
  blindScreening: false,
  shortlistThreshold: 70,
  weights: {
    skills: 40,
    experience: 25,
    education: 10,
    projects: 15,
    communication: 10
  },
  autoSave: true,
  exportFormat: 'markdown'
};

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [availableModels, setAvailableModels] = useState([]);
  const [savedToast, setSavedToast] = useState(false);
  const [resetToast, setResetToast] = useState(false);
  const [candidateCount, setCandidateCount] = useState(0);

  useEffect(() => {
    // Load persisted settings
    const stored = localStorage.getItem('talentlens_settings');
    if (stored) {
      try {
        setSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
      } catch (err) {
        console.error('Failed to parse settings:', err);
      }
    }

    // Fetch available Gemini models & candidate count
    api.get('/models').then(res => {
      if (res.data && Array.isArray(res.data)) {
        setAvailableModels(res.data);
      }
    }).catch(console.error);

    api.get('/candidates').then(res => {
      if (res.data) setCandidateCount(res.data.length);
    }).catch(console.error);
  }, []);

  const handleChange = (field, val) => {
    setSettings(prev => ({ ...prev, [field]: val }));
  };

  const handleWeightChange = (key, val) => {
    setSettings(prev => ({
      ...prev,
      weights: { ...prev.weights, [key]: Number(val) }
    }));
  };

  const handleSave = () => {
    localStorage.setItem('talentlens_settings', JSON.stringify(settings));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to default values?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem('talentlens_settings', JSON.stringify(DEFAULT_SETTINGS));
      setTheme('light');
      setResetToast(true);
      setTimeout(() => setResetToast(false), 3000);
    }
  };

  const handleClearPool = async () => {
    if (window.confirm('Are you sure you want to delete ALL candidate profiles? This action cannot be undone.')) {
      try {
        await api.delete('/candidates');
        setCandidateCount(0);
        alert('Candidate pool cleared successfully.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const totalWeight = Object.values(settings.weights).reduce((a, b) => a + b, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <HeroBanner
            badge="Application Preferences"
            title="Settings & System Configuration"
            subtitle="Configure dark mode, LLM parameters, organization profile, blind screening defaults, and candidate scoring weights."
            icon={SettingsIcon}
          />
        </div>
      </div>

      {/* Save / Reset Toasts */}
      {savedToast && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" /> Settings saved successfully! Preferences apply across all screens.
        </div>
      )}
      {resetToast && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <RotateCcw size={16} className="text-amber-600 dark:text-amber-400" /> Settings reset to default configuration.
        </div>
      )}

      {/* Section 0: Appearance & Theme Mode */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Appearance & Theme Mode</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Choose your preferred visual theme for the entire webpage.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean high-contrast theme' },
            { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Sleek dark theme for night' }
          ].map(item => (
            <div
              key={item.id}
              onClick={() => setTheme(item.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                theme === item.id
                  ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              <item.icon size={20} className={theme === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
              <div>
                <div className="font-bold text-xs">{item.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 1: AI Engine & Model Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Cpu size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">AI Model & LLM Defaults</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure Gemini model preferences and interview generator settings.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Primary Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Default Gemini LLM Model</label>
            <select
              value={settings.defaultModel}
              onChange={e => handleChange('defaultModel', e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {availableModels.length > 0 ? (
                availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))
              ) : (
                <>
                  <option value="gemini-3.6-flash">gemini-3.6-flash (Recommended)</option>
                  <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                  <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                </>
              )}
            </select>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block">Models detected live from your Google Gemini API Key.</span>
          </div>

          {/* Question Count */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Default Questions per Candidate</label>
            <select
              value={settings.questionCount}
              onChange={e => handleChange('questionCount', Number(e.target.value))}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={5}>5 Questions (Fast Screening)</option>
              <option value={8}>8 Questions (Standard Balanced)</option>
              <option value={10}>10 Questions (Detailed Assessment)</option>
              <option value={12}>12 Questions (Deep Technical)</option>
            </select>
          </div>

          {/* Default Focus */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Default Interview Focus</label>
            <select
              value={settings.focus}
              onChange={e => handleChange('focus', e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Balanced">Balanced (Technical + HR)</option>
              <option value="Technical">Deep Technical & Coding</option>
              <option value="System Design">Architecture & Design</option>
              <option value="Behavioral">Behavioral & Culture Fit</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Default Question Difficulty</label>
            <select
              value={settings.difficulty}
              onChange={e => handleChange('difficulty', e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Mixed">Mixed (Easy to Hard)</option>
              <option value="Easy">Easy (Junior Level)</option>
              <option value="Medium">Medium (Mid Level)</option>
              <option value="Hard">Hard (Senior / Staff Level)</option>
            </select>
          </div>
        </div>

        {/* Temperature Slider */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>AI Temperature / Creativity ({settings.temperature})</span>
            <span className="text-slate-400 font-normal">Lower = More Deterministic & Precise</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={settings.temperature}
            onChange={e => handleChange('temperature', Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
          />
        </div>
      </div>

      {/* Section 2: Recruitment & Scoring Weights */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
            <Sliders size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Scoring Formula & Bias Prevention</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Customize default weight distribution and blind screening defaults.</p>
          </div>
        </div>

        {/* Blind Screening Switch */}
        <div className="p-4 bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EyeOff size={20} className="text-purple-600 dark:text-purple-400" />
            <div>
              <span className="font-bold text-xs text-purple-900 dark:text-purple-200 block">Default Blind Screening</span>
              <span className="text-[11px] text-purple-700 dark:text-purple-300">Automatically mask candidate names, emails, phones, and links before AI analysis.</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.blindScreening}
            onChange={e => handleChange('blindScreening', e.target.checked)}
            className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
          />
        </div>

        {/* Shortlist Threshold */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Auto-Shortlist Score Cutoff ({settings.shortlistThreshold}/100 pts)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Overall score ≥ {settings.shortlistThreshold} → Shortlist</span>
          </div>
          <input
            type="range"
            min="50"
            max="90"
            step="5"
            value={settings.shortlistThreshold}
            onChange={e => handleChange('shortlistThreshold', Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
          />
        </div>

        {/* Dimension Weights */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Default Dimension Weights (Total: {totalWeight}%)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(settings.weights).map(([k, val]) => (
              <div key={k} className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-xs font-semibold capitalize text-slate-700 dark:text-slate-300 mb-1">
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

      {/* Section 3: Organization & Email Templates */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Building size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Organization & Communication</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure company metadata and default recruiter email signatures.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Company / Organization Name</label>
            <input
              type="text"
              value={settings.orgName}
              onChange={e => handleChange('orgName', e.target.value)}
              placeholder="e.g. Acme Global Inc."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Default Email Sign-off Title</label>
            <input
              type="text"
              value={settings.recruiterSignoff}
              onChange={e => handleChange('recruiterSignoff', e.target.value)}
              placeholder="e.g. Talent Acquisition Team"
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Data Management & Reset */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Data Management & Reset</h2>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{candidateCount} candidates stored</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} /> Reset Settings to Default
          </button>

          {candidateCount > 0 && (
            <button
              onClick={handleClearPool}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-xs font-bold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/80 transition-colors cursor-pointer"
            >
              <Trash2 size={14} /> Clear All Candidate Data ({candidateCount})
            </button>
          )}
        </div>
      </div>

      {/* Save Action Footer */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-base rounded-2xl shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Save size={18} /> Save Preferences
        </button>
      </div>
    </motion.div>
  );
}
