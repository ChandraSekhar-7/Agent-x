import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Target, Users, LayoutDashboard, BarChart2, Briefcase, 
  Trash2, Cpu, Settings as SettingsIcon, Sun, Moon, ShieldCheck, Bot,
  LogIn, LogOut, UserCheck, Building2, User
} from 'lucide-react';
import clsx from 'clsx';
import api from './api';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import LogoEmblem from './components/LogoEmblem';
import WelcomeSplash from './components/WelcomeSplash';

const navItems = [
  { name: 'Screen Resumes', path: '/', icon: Target },
  { name: 'Candidate Pool & Exam', path: '/candidates', icon: Users },
  { name: 'Compare Candidates', path: '/compare', icon: LayoutDashboard },
  { name: 'Pipeline Analytics', path: '/insights', icon: BarChart2 },
  { name: 'Job Requisitions Hub', path: '/job-requisitions', icon: Building2 },
  { name: 'Career & Jobs', path: '/find-jobs', icon: Briefcase },
  { name: '6 Multi-Agent Swarm', path: '/swarm', icon: Bot },
  { name: 'System Settings', path: '/settings', icon: SettingsIcon },
  { name: 'Login / Register', path: '/login', icon: LogIn }
];


export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [modelName, setModelName] = useState('Gemini 3.6 Flash');
  const [candidateCount, setCandidateCount] = useState(0);

  useEffect(() => {
    fetchInfo();
  }, [location.pathname]);

  const fetchInfo = async () => {
    try {
      const modelsRes = await api.get('/models');
      if (modelsRes.data && modelsRes.data.length > 0) {
        const topModel = modelsRes.data[0];
        setModelName(topModel.replace('gemini-', 'Gemini ').replace('-latest', ''));
      }
      const cRes = await api.get('/candidates');
      setCandidateCount(cRes.data ? cRes.data.length : 0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearCandidates = async () => {
    if (window.confirm('Are you sure you want to clear all candidate profiles?')) {
      try {
        await api.delete('/candidates');
        setCandidateCount(0);
        navigate('/');
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Filter navigation links based on user role
  const filteredNavItems = navItems.filter(item => {
    if (user?.role === 'candidate') {
      // Candidates see Candidate Pool & Exam, Screen Resumes, Career & Jobs, Swarm, and Settings
      return ['Candidate Pool & Exam', 'Screen Resumes', 'Career & Jobs', '6 Multi-Agent Swarm', 'System Settings'].includes(item.name);
    }
    // Recruiters see all console tools
    return item.name !== 'Login / Register';
  });




  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
      {/* Page Opening Welcome Animation */}
      <WelcomeSplash />

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-xs z-20 sticky top-0 h-screen transition-colors duration-200">
        <div>
          {/* Logo Header Banner */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 group">
                <LogoEmblem className="w-9 h-9 shrink-0" />
                
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                      TalentLens
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      AI
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Enterprise HR
                  </span>
                </div>
              </Link>

              {/* Theme Switcher */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </div>

          {/* AI System Status */}
          <div className="mx-3 mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">System Engine</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">{modelName}</span>
            </div>
            <Cpu size={14} className="text-slate-400 shrink-0" />
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 mt-2">
            {filteredNavItems.map((item) => {
              const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={clsx(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all duration-150 font-semibold text-xs",
                    active 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className={clsx("w-4 h-4", active ? "text-white" : "text-slate-400 dark:text-slate-500")} />
                    <span>{item.name}</span>
                  </div>
                  {item.name.includes('Pool') && candidateCount > 0 && (
                    <span className={clsx(
                      "text-[10px] font-bold px-2 py-0.5 rounded-md",
                      active ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    )}>
                      {candidateCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 bg-white dark:bg-slate-900">
          
          {/* Authenticated User Profile Box */}
          {user ? (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-xs",
                    user.role === 'recruiter' ? "bg-purple-600" : "bg-indigo-600"
                  )}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                      {user.email}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                  title="Sign Out"
                >
                  <LogOut size={14} />
                </button>
              </div>

              {/* Role badge */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className={clsx(
                  "text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1",
                  user.role === 'recruiter' 
                    ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                    : "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                )}>
                  {user.role === 'recruiter' ? <Building2 size={10} /> : <User size={10} />}
                  <span className="capitalize">{user.role}</span>
                </span>

                {user.companyName && (
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[90px]">
                    {user.companyName}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all shadow-xs"
            >
              <LogIn size={14} /> Sign In / Register
            </Link>
          )}

          {candidateCount > 0 && (
            <button
              onClick={handleClearCandidates}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors border border-rose-200 dark:border-rose-900/40 cursor-pointer"
            >
              <Trash2 size={12} /> Clear Pool ({candidateCount})
            </button>
          )}

          <div className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-medium">
            TalentLens Enterprise v2.5
          </div>
        </div>
      </aside>

      {/* Main Console Area */}
      <main className="flex-1 min-w-0 min-h-screen overflow-auto flex flex-col">
        {/* Top Console Bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  TalentLens AI Console
                </h1>
                <span className={clsx(
                  "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                  user?.role === 'recruiter' 
                    ? "bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                    : "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                )}>
                  {user?.role === 'recruiter' ? 'Recruiter Console' : 'Candidate Console'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Welcome, <span className="font-bold text-slate-800 dark:text-slate-200">{user?.name}</span> {user?.companyName ? `(${user.companyName})` : user?.headline ? `(${user.headline})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <LogOut size={14} /> Exit Console
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-6 flex-1 w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );

}

