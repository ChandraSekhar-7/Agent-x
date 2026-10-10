import { ShieldCheck, Cpu, Activity, Sparkles } from 'lucide-react';

export default function HeroBanner({ 
  badge = "Enterprise Recruitment", 
  title = "TalentLens AI", 
  subtitle = "Screen resumes, evaluate candidate dimensions, spot bias, and generate structured interview scorecards.",
  icon: Icon = ShieldCheck
}) {
  return (
    <div className="py-1 space-y-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-6 mb-2">
      {/* Top Badge Chip */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/80 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300">
        <Icon size={13} className="text-indigo-600 dark:text-indigo-400" />
        <span className="uppercase tracking-wider text-[10px]">{badge}</span>
      </div>
      
      {/* Title & Stats Grid */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>

          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Feature Tags */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Cpu size={13} className="text-indigo-500" />
            <span>Gemini Engine</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-slate-500" />
            <span>Bias Filter</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Activity size={13} className="text-emerald-500" />
            <span>Live System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
