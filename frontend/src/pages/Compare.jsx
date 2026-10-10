import { useState, useEffect } from 'react';
import api from '../api';
import clsx from 'clsx';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Trophy, CheckCircle2, ArrowRight, Scale } from 'lucide-react';
import { motion } from 'framer-motion';

const scoreBg = s => s >= 70 ? 'bg-emerald-500 text-white' : s >= 45 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white';

export default function Compare() {
  const [candidates, setCandidates] = useState([]);
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');

  useEffect(() => {
    api.get('/candidates').then(r => {
      setCandidates(r.data);
      if (r.data.length > 1) {
        setAId(r.data[0]._id);
        setBId(r.data[1]._id);
      } else if (r.data.length === 1) {
        setAId(r.data[0]._id);
      }
    }).catch(console.error);
  }, []);

  if (candidates.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 space-y-3">
        <Scale className="w-12 h-12 text-slate-300 dark:text-slate-600" />
        <p className="font-semibold text-slate-600 dark:text-slate-300">Screen at least 2 candidates to compare them side-by-side.</p>
      </div>
    );
  }

  const a = candidates.find(c => c._id === aId);
  const b = candidates.find(c => c._id === bId);
  if (!a || !b) return null;

  const radarData = [
    { subject: 'Skills', A: a.scores?.skills || 0, B: b.scores?.skills || 0 },
    { subject: 'Experience', A: a.scores?.experience || 0, B: b.scores?.experience || 0 },
    { subject: 'Education', A: a.scores?.education || 0, B: b.scores?.education || 0 },
    { subject: 'Projects', A: a.scores?.projects || 0, B: b.scores?.projects || 0 },
    { subject: 'Comm', A: a.scores?.communication || 0, B: b.scores?.communication || 0 }
  ];

  const items = [
    ['Overall Score', a.scores?.overall || 0, b.scores?.overall || 0, 1],
    ['Skills Score', a.scores?.skills || 0, b.scores?.skills || 0, 1],
    ['Experience Score', a.scores?.experience || 0, b.scores?.experience || 0, 1],
    ['Education Score', a.scores?.education || 0, b.scores?.education || 0, 1],
    ['Projects Score', a.scores?.projects || 0, b.scores?.projects || 0, 1],
    ['Communication Score', a.scores?.communication || 0, b.scores?.communication || 0, 1],
    ['Total Exp (years)', a.total_experience_years || 0, b.total_experience_years || 0, 1],
    ['Matched Skills Count', (a.matched_skills || []).length, (b.matched_skills || []).length, 1],
    ['Skill Gaps Count', (a.gaps || []).length, (b.gaps || []).length, -1],
    ['Red Flags Count', (a.red_flags || []).length, (b.red_flags || []).length, -1]
  ];

  const sa = new Set((a.matched_skills || []).map(s => s.skill));
  const sb = new Set((b.matched_skills || []).map(s => s.skill));
  const both = [...sa].filter(s => sb.has(s));
  const onlyA = [...sa].filter(s => !sb.has(s));
  const onlyB = [...sb].filter(s => !sa.has(s));

  const lead = Math.abs((a.scores?.overall || 0) - (b.scores?.overall || 0));
  const leader = (a.scores?.overall || 0) >= (b.scores?.overall || 0) ? a.name : b.name;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
          <Scale className="text-indigo-600 dark:text-indigo-400" size={24} />
          <span>Candidate Head-to-Head Comparison</span>
        </h1>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{candidates.length} Profiles Available</span>
      </div>

      {/* Candidate Selector Dropdowns */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Candidate A</label>
          <select 
            className="w-full p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 shadow-sm outline-none font-bold text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500" 
            value={aId} 
            onChange={e => setAId(e.target.value)}
          >
            {candidates.map(c => <option key={c._id} value={c._id}>{c.name} — {c.role} ({c.scores?.overall || 0} pts)</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-cyan-700 dark:text-cyan-400">Candidate B</label>
          <select 
            className="w-full p-3 rounded-xl border border-cyan-200 dark:border-cyan-800 bg-white dark:bg-slate-900 shadow-sm outline-none font-bold text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500" 
            value={bId} 
            onChange={e => setBId(e.target.value)}
          >
            {candidates.map(c => <option key={c._id} value={c._id}>{c.name} — {c.role} ({c.scores?.overall || 0} pts)</option>)}
          </select>
        </div>
      </div>

      {/* Candidate Cards Header */}
      <div className="grid md:grid-cols-2 gap-6">
        {[ { c: a, color: 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/40' }, { c: b, color: 'border-cyan-200 dark:border-cyan-800 bg-cyan-50/40 dark:bg-cyan-950/40' } ].map(({ c, color }, idx) => (
          <div key={c._id} className={clsx("rounded-2xl border p-5 flex items-center justify-between shadow-sm", color)}>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate {idx === 0 ? 'A' : 'B'}</span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{c.name}</h2>
              <div className="text-xs text-slate-500 dark:text-slate-400">{c.role} · {c.total_experience_years}y exp</div>
            </div>
            <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-md", scoreBg(c.scores?.overall || 0))}>
              {c.scores?.overall || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Radar Overlay & Table Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Radar Overlay Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-[380px]">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Dimension Overlay</h3>
          <ResponsiveContainer width="100%" height="90%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#475569" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar name={a.name} dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              <Radar name={b.name} dataKey="B" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Metrics Breakdown Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold">
                <th className="p-3">Evaluation Metric</th>
                <th className="p-3 text-indigo-700 dark:text-indigo-400">{a.name}</th>
                <th className="p-3 text-cyan-700 dark:text-cyan-400">{b.name}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(([label, x, y, d], i) => {
                const win = x === y ? 0 : ((x > y) === (d > 0) ? 1 : 2);
                return (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-300">{label}</td>
                    <td className={clsx("p-3 font-bold", win === 1 ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300" : "text-slate-800 dark:text-slate-200")}>{x}</td>
                    <td className={clsx("p-3 font-bold", win === 2 ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300" : "text-slate-800 dark:text-slate-200")}>{y}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Skill Venn Breakdown */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Skills Breakdown Venn Matrix</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm space-y-2">
            <div className="font-bold text-xs text-indigo-700 dark:text-indigo-400">Only {a.name}</div>
            <div className="flex flex-wrap gap-1">
              {onlyA.length ? onlyA.map(s => <span key={s} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded-md text-[11px] font-bold">{s}</span>) : <span className="text-slate-400 text-xs">–</span>}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm space-y-2">
            <div className="font-bold text-xs text-emerald-700 dark:text-emerald-400">Shared Skills (Both)</div>
            <div className="flex flex-wrap gap-1">
              {both.length ? both.map(s => <span key={s} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md text-[11px] font-bold">{s}</span>) : <span className="text-slate-400 text-xs">–</span>}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-cyan-100 dark:border-cyan-900/50 shadow-sm space-y-2">
            <div className="font-bold text-xs text-cyan-700 dark:text-cyan-400">Only {b.name}</div>
            <div className="flex flex-wrap gap-1">
              {onlyB.length ? onlyB.map(s => <span key={s} className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 rounded-md text-[11px] font-bold">{s}</span>) : <span className="text-slate-400 text-xs">–</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison AI Verdict Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 to-indigo-900 text-white font-bold text-center flex items-center justify-center gap-3 shadow-lg">
        <Trophy className="text-amber-400" />
        <span className="text-sm">
          {lead ? `${leader} leads overall match by ${lead} point(s).` : 'Both candidates score identically.'}
        </span>
      </div>
    </motion.div>
  );
}
