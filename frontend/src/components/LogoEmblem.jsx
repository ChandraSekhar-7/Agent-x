export default function LogoEmblem({ className = "w-9 h-9" }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Container Badge */}
      <div className="w-full h-full rounded-xl bg-slate-900 dark:bg-slate-800 border border-slate-700/80 p-2 flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-indigo-400">
          {/* Target Reticle Outer Ring */}
          <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="6" strokeDasharray="50 12" />
          {/* Inner Precision Grid */}
          <circle cx="50" cy="50" r="20" stroke="#818cf8" strokeWidth="4" />
          {/* Center Precision Node */}
          <circle cx="50" cy="50" r="8" fill="#4f46e5" />
          <path d="M50 8 L50 20 M50 80 L50 92 M8 50 L20 50 M80 50 L92 50" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
