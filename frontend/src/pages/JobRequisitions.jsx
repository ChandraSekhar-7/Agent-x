import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Plus, Sparkles, Target, Trash2, CheckCircle2, 
  MapPin, Briefcase, DollarSign, Layers, Loader2, FileText, ArrowRight, ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import HeroBanner from '../components/HeroBanner';

export default function JobRequisitions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    department: 'Engineering',
    location: 'Hybrid - Remote',
    experience: '3-5 years',
    salary: 'Competitive Market Rate',
    description: '',
    requiredSkills: ''
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/jobs');
      setJobs(res.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch job requisitions.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleAiGenerateJd = async () => {
    if (!formData.title.trim()) {
      setError('Please enter a Job Title first to generate AI JD.');
      return;
    }
    setAiGenerating(true);
    setError('');
    try {
      const res = await api.post('/jobs/generate-jd', {
        title: formData.title,
        department: formData.department,
        experience: formData.experience
      });
      
      setFormData(prev => ({
        ...prev,
        description: res.data.description || prev.description,
        salary: res.data.salary || prev.salary,
        requiredSkills: res.data.requiredSkills ? res.data.requiredSkills.join(', ') : prev.requiredSkills
      }));
      setSuccess('AI successfully drafted Job Description & Skill requirements!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'AI JD generation failed.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Job Title and Description are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...formData,
        requiredSkills: formData.requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
        recruiterName: user?.name || 'Recruiter Lead',
        companyName: user?.companyName || 'TalentLens HR'
      };

      const res = await api.post('/jobs', payload);
      setJobs([res.data.job, ...jobs]);
      setSuccess('Job Requisition published successfully!');
      setShowCreateModal(false);
      setFormData({
        title: '',
        department: 'Engineering',
        location: 'Hybrid - Remote',
        experience: '3-5 years',
        salary: 'Competitive Market Rate',
        description: '',
        requiredSkills: ''
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to create Job Requisition.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (id) => {
    if (window.confirm('Are you sure you want to delete this job requisition?')) {
      try {
        await api.delete(`/jobs/${id}`);
        setJobs(jobs.filter(j => j._id !== id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleScreenForJd = (job) => {
    // Navigate to screening tool with JD passed in location state or localStorage
    localStorage.setItem('talentlens_active_jd', job.description);
    navigate('/');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-6xl mx-auto">
      
      {/* Hero Header */}
      <HeroBanner
        badge="Recruiter Workspace"
        title="Job Requisition Desk & AI JD Studio"
        subtitle="Post and manage enterprise Job Descriptions, set candidate scoring criteria, generate AI evaluation rubrics, and screen candidate resumes directly."
        icon={Building2}
      />

      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Active Job Requisitions</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-xs font-black">
              {jobs.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Requisitions created for {user?.companyName || 'TalentLens Enterprise'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={16} /> Post New Requisition
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Create Requisition Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  Create Job Requisition
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Define position requirements & scoring rubrics
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Job Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Senior Full Stack Engineer"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/30 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/30 outline-none"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Data & Artificial Intelligence">Data & AI</option>
                    <option value="Product & Design">Product & Design</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Experience Level
                  </label>
                  <input
                    type="text"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    placeholder="e.g. 3-5 years"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Location / Work Mode
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g. Hybrid - Bangalore"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Salary Range
                  </label>
                  <input
                    type="text"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    placeholder="e.g. ₹20L - ₹30L / yr"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* AI JD Generator Action */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="text-xs text-purple-900 dark:text-purple-200 font-medium">
                    Auto-generate Job Description & Skill requirements with Gemini AI
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAiGenerateJd}
                  disabled={aiGenerating}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {aiGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{aiGenerating ? 'Drafting...' : 'AI Generate JD'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Required Skills (Comma separated)
                </label>
                <input
                  type="text"
                  name="requiredSkills"
                  value={formData.requiredSkills}
                  onChange={handleInputChange}
                  placeholder="React, Node.js, TypeScript, MongoDB, AWS"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Job Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="description"
                  rows={5}
                  required
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Paste or write full job description..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/30 outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Publish Requisition</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requisitions Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
          <Loader2 size={20} className="animate-spin text-purple-600" />
          <span className="text-xs font-bold">Loading Job Requisitions...</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
          <Building2 size={40} className="mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Job Requisitions Posted Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Post New Requisition" to create a new job specification and use AI to generate job rubrics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs hover:border-purple-500/50 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200/50 dark:border-purple-900/50">
                      {job.department || 'Engineering'}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
                      {job.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleDeleteJob(job._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Delete Requisition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                {/* Job Meta Info */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-400" />
                    <span className="truncate">{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Briefcase size={13} className="text-slate-400" />
                    <span>{job.experience}</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <DollarSign size={13} className="text-emerald-500" />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{job.salary}</span>
                  </div>
                </div>

                {/* Skills Chips */}
                {job.requiredSkills && job.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.requiredSkills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-slate-400">
                  {job.applicantCount ? `${job.applicantCount} Applicants` : 'Active Requisition'}
                </span>

                <button
                  onClick={() => handleScreenForJd(job)}
                  className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-600 hover:text-white text-purple-700 dark:text-purple-300 text-xs font-bold transition-all border border-purple-200/80 dark:border-purple-800/80 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Target size={14} />
                  <span>Screen Resumes for this JD</span>
                  <ArrowRight size={13} />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </motion.div>
  );
}
