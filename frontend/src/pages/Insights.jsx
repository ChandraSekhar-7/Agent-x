import { useState, useEffect } from 'react';
import api from '../api';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { BarChart2, PieChart as PieIcon, Award, AlertCircle, Users, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#64748b', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
const PAL = ['#6366f1', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b'];

export default function Insights() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    api.get('/candidates').then(r => setCandidates(r.data)).catch(console.error);
  }, []);

  if (!candidates.length) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 space-y-3">
        <BarChart2 className="w-12 h-12 text-slate-300 dark:text-slate-600" />
        <p className="font-semibold text-slate-600 dark:text-slate-300">No candidate analytics available yet.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Screen resumes to generate pipeline metrics.</p>
      </div>
    );
  }

  // Stacked score dimension breakdown
  const dims = ['skills', 'experience', 'education', 'projects', 'communication'];
  const stackData = candidates.map(c => {
    const row = { name: (c.name || '').split(' ')[0] };
    dims.forEach(d => row[d] = c.scores?.[d] || 0);
    return row;
  });

  // Pipeline status count
  const statusCount = {};
  candidates.forEach(c => {
    const st = c.status || 'Pending';
    statusCount[st] = (statusCount[st] || 0) + 1;
  });
  const pieData = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

  // Top skill gaps
  const gapCount = {};
  candidates.forEach(c => (c.gaps || []).forEach(g => {
    gapCount[g.skill] = (gapCount[g.skill] || 0) + 1;
  }));
  const topGaps = Object.entries(gapCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

  // Top strengths
  const skillCount = {};
  candidates.forEach(c => (c.matched_skills || []).forEach(m => {
    skillCount[m.skill] = (skillCount[m.skill] || 0) + 1;
  }));
  const topSkills = Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 15);

  const avgScore = Math.round(candidates.reduce((a, b) => a + (b.scores?.overall || 0), 0) / candidates.length);
  const topCandidate = [...candidates].sort((a, b) => (b.scores?.overall || 0) - (a.scores?.overall || 0))[0];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <BarChart2 className="text-indigo-600 dark:text-indigo-400" size={24} />
            <span>Candidate Pool & Pipeline Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Aggregated insights across {candidates.length} candidate profiles.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Candidates</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{candidates.length}</div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Profiles in DB</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pool Average Score</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{avgScore} / 100</div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Weighted Mean</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Candidate</span>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{topCandidate?.name || '–'}</div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">{topCandidate?.scores?.overall || 0}/100 Score</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Shortlist Rate</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {Math.round(100 * (statusCount['Shortlist'] || 0) / candidates.length)}%
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{statusCount['Shortlist'] || 0} shortlisted</span>
        </div>
      </div>

      {/* Score Composition Stacked Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Score Dimension Breakdown per Candidate</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#475569" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', backgroundColor: '#1e293b', color: '#f8fafc' }} />
              {dims.map((d, i) => (
                <Bar key={d} dataKey={d} stackId="a" fill={PAL[i]} name={d.charAt(0).toUpperCase() + d.slice(1)} />
              ))}
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Skill Gaps Frequency */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Most Frequent Skill Gaps in Candidate Pool</h2>
          {topGaps.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topGaps} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#475569" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }} />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-8 text-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">No skill gaps found across candidates</div>
          )}
        </div>

        {/* Pipeline Distribution Pie */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Recruitment Pipeline Status</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value" label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Strengths Tag Cloud */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Most Common Matched Strengths</h2>
        <div className="flex flex-wrap gap-2">
          {topSkills.map(([name, count]) => (
            <span key={name} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl text-xs font-bold">
              {name} <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">({count})</span>
            </span>
          ))}
          {!topSkills.length && <span className="text-slate-400 text-xs">No skills matched yet</span>}
        </div>
      </div>
    </motion.div>
  );
}
