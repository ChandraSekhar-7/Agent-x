import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, Building2, Lock, Mail, Phone, Briefcase, 
  ArrowRight, ShieldCheck, Sparkles, Eye, EyeOff, CheckCircle2, AlertCircle, UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LogoEmblem from '../components/LogoEmblem';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, user: currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      const from = location.state?.from?.pathname || (currentUser.role === 'candidate' ? '/candidates' : '/');
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, location]);

  // Mode: 'login' | 'register'
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Selected Role: 'candidate' | 'recruiter'
  const [role, setRole] = useState('candidate');


  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    headline: '',
    phone: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleQuickFill = (targetRole, mode) => {
    setRole(targetRole);
    setIsLoginMode(mode === 'login');
    setError('');
    
    if (targetRole === 'candidate') {
      setFormData({
        name: 'Alex Rivera',
        email: 'alex.candidate@talentlens.io',
        password: 'Password123!',
        companyName: '',
        headline: 'Senior Full Stack Engineer (React & Node.js)',
        phone: '+1 (555) 234-5678'
      });
    } else {
      setFormData({
        name: 'Sarah Jenkins',
        email: 'sarah.recruiter@techcorp.io',
        password: 'Password123!',
        companyName: 'TechCorp Global Ltd',
        headline: 'Lead Technical Talent Recruiter',
        phone: '+1 (555) 987-6543'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLoginMode) {
        // Sign In
        const loggedUser = await login(formData.email, formData.password, role);
        setSuccess(`Welcome back, ${loggedUser.name}!`);
        setTimeout(() => {
          navigate('/candidates');
        }, 800);
      } else {
        // Register
        if (!formData.name.trim()) {
          throw new Error('Full Name is required for registration.');
        }

        const newUser = await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role,
          companyName: formData.companyName,
          headline: formData.headline,
          phone: formData.phone
        });

        setSuccess(`Account created successfully! Welcome to TalentLens AI, ${newUser.name}.`);
        setTimeout(() => {
          navigate('/candidates');
        }, 800);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'An error occurred during authentication.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all">
        
        {/* Left Side Banner / Feature Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Background Decorative Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <LogoEmblem className="w-10 h-10 shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xl tracking-tight text-white">TalentLens</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">AI</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Enterprise Authentication</span>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight">
                {role === 'candidate' ? (
                  <>Land Your Dream Career with <span className="text-indigo-400">AI Precision</span></>
                ) : (
                  <>Hire Top 1% Talent with <span className="text-indigo-400">AI Automation</span></>
                )}
              </h2>
              <p className="text-xs lg:text-sm text-slate-300 leading-relaxed font-normal">
                {role === 'candidate'
                  ? 'Access smart resume scoring, direct job matching, ATS optimization, and AI interview prep tailored to your profile.'
                  : 'Automate resume screening, run multi-agent candidate evaluations, compare profiles, and streamline technical hiring.'}
              </p>
            </div>

            {/* Role Features List */}
            <div className="space-y-3 pt-2">
              {(role === 'candidate' ? [
                'Instant Resume ATS & Match Score Analysis',
                'Personalized AI Interview Question Practice',
                'Direct Applications to Recruiter Postings',
                'Data stored securely in MongoDB Database'
              ] : [
                'Automated Multi-Resume Parsing & Scoring',
                'Side-by-Side Candidate Matrix Comparison',
                '6 Multi-Agent Swarm Screening Engines',
                'Complete Candidate Database Management'
              ]).map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-200">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Demo Fill Buttons Footer */}
          <div className="relative z-10 pt-8 border-t border-slate-800/80 mt-6 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              ⚡ Quick Demo Autofill:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('candidate', 'login')}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-indigo-300 border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <User size={13} /> Demo Candidate
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('recruiter', 'login')}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-purple-300 border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Building2 size={13} /> Demo Recruiter
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Form Panel */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div>
            
            {/* Header with Role Selection Tabs */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {isLoginMode ? 'Welcome Back' : 'Create an Account'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isLoginMode ? 'Sign in to access your dashboard' : 'Join TalentLens AI as a Candidate or Recruiter'}
                  </p>
                </div>

                {/* Login / Register Toggle Pill */}
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => { setIsLoginMode(true); setError(''); setSuccess(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isLoginMode 
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsLoginMode(false); setError(''); setSuccess(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !isLoginMode 
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Register
                  </button>
                </div>
              </div>

              {/* User Type Selector (Candidate vs Recruiter) */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setRole('candidate'); setError(''); }}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer text-left ${
                    role === 'candidate'
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${role === 'candidate' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    <User size={18} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold">Candidate</span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">Job Seeker / Applicant</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setRole('recruiter'); setError(''); }}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer text-left ${
                    role === 'recruiter'
                      ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 shadow-xs ring-2 ring-purple-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${role === 'recruiter' ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold">Recruiter</span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400">HR Manager / Employer</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Error & Success Messages */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Name field (Only during Registration) */}
              {!isLoginMode && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={role === 'candidate' ? 'e.g. Alex Rivera' : 'e.g. Sarah Jenkins'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder={role === 'candidate' ? 'alex@example.com' : 'sarah@company.com'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Additional Registration Fields based on Role */}
              {!isLoginMode && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {role === 'recruiter' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Company Name
                      </label>
                      <div className="relative">
                        <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          placeholder="e.g. Acme Tech Inc"
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500/30 outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Target Role / Headline
                      </label>
                      <div className="relative">
                        <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          name="headline"
                          value={formData.headline}
                          onChange={handleInputChange}
                          placeholder="e.g. Senior Frontend Engineer"
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500/30 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500/30 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  role === 'candidate'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-500/25'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/25'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <>
                    <span>{isLoginMode ? `Sign In as ${role === 'candidate' ? 'Candidate' : 'Recruiter'}` : `Create ${role === 'candidate' ? 'Candidate' : 'Recruiter'} Account`}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isLoginMode ? "Don't have an account yet?" : "Already have an account?"}{' '}
              <button
                type="button"
                onClick={() => { setIsLoginMode(!isLoginMode); setError(''); setSuccess(''); }}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {isLoginMode ? 'Register now' : 'Sign in here'}
              </button>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
