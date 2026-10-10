import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LogoEmblem from './LogoEmblem';
import { ShieldCheck, Cpu } from 'lucide-react';

export default function WelcomeSplash({ onComplete }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      if (onComplete) onComplete();
    }, 1800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden select-none font-sans"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />

          {/* Central Corporate Content */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-5 max-w-sm px-6">
            
            {/* Logo Emblem */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <LogoEmblem className="w-16 h-16" />
            </motion.div>

            {/* Title & Badge */}
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="space-y-1.5"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
                <ShieldCheck size={12} className="text-indigo-400" />
                <span className="uppercase tracking-widest text-[10px]">Enterprise Platform</span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                TalentLens Enterprise
              </h1>

              <p className="text-xs text-slate-400 font-medium">
                AI Candidate Intelligence & Recruitment System
              </p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "100%", opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="w-40 h-1 bg-slate-800 rounded-full overflow-hidden relative mt-2"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="w-full h-full bg-indigo-500 rounded-full"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium"
            >
              <Cpu size={12} className="text-slate-400" />
              <span>Initializing Workspace...</span>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
