import { Check, ChevronRight } from "lucide-react"; 

export const SidebarIcon = ({ icon, active = false, onClick, title }) => {
  return (
    <div 
      className={`relative group p-2.5 rounded cursor-pointer transition-colors ${active ? 'bg-[#1D2B3F] text-blue-400' : 'text-white hover:text-white hover:bg-[#1A1A1A]'}`}
      onClick={onClick}>
        {icon}
        {title && (
          <span className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#0D0D0D] font-mono font-bold tracking-widest text-blue-400 text-xs whitespace-nowrap rounded-none opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 border border-[#2A2A2A] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            {title}
          </span>
        )}
    </div>
  );
}

export const DashboardCard = ({ title, children, className = "", icon = null }) => {
  return (
    <div className={`bg-[#111111] border border-[#2A2A2A] rounded-sm p-3 relative group ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-bold text-gray-300 uppercase tracking-wide">{title}</h3>
        <div className="flex items-center space-x-2">{icon}</div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-[#444] opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-[#444] opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
  );
}

export const CustomCheckbox = ({ checked, onChange, label, linkText, endText }) => {
  return (
    <div className="flex items-center space-x-3 group">
      <button onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-5 h-5 border-2 rounded-sm transition-all duration-200 ${
          checked 
            ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/50' 
            : 'border-blue-500/40 hover:border-blue-500/70'
        }`}
        type="button"
      >
        {checked && (<Check size={16} className="absolute inset-0 m-auto text-white animate-pulse" strokeWidth={3}/>)}
      </button>
      <label className="text-xs text-gray-400 leading-relaxed select-none cursor-pointer group-hover:text-gray-300 transition-colors whitespace-nowrap">
        {label} <span className="text-blue-400 hover:text-blue-300 cursor-pointer">{linkText}</span> {endText}
      </label>
    </div>
  );
}

export const TabItem = ({ active, onClick, icon, label }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-1 rounded transition-all text-base font-bold uppercase tracking-tight ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
          : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
      }`}
    >{icon}<span>{label}</span>
    </button>
  );
}

export const Table = ({ children }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-base border-collapse">{children}</table>
    </div>
  );
}

export const THead = ({ columns }) => {
  return (
    <thead>
      <tr className="border-b border-[#2A2A2A] text-[#1d4ed8] text-base uppercase font-bold tracking-tighter">
        {columns.map((c, i) => (
          <th key={i} className={`py-4 ${i === 0 ? 'px-4' : ''} ${i === columns.length - 1 ? 'text-left px-5' : ''}`}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}

export const CornerBrackets = () => {
  return (
    <>
      <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-blue-500 pointer-events-none opacity-40" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-blue-500 pointer-events-none opacity-40" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-blue-500 pointer-events-none opacity-40" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-blue-500 pointer-events-none opacity-40" />
      {/* Decorative dots */}
      <div className="absolute top-2 left-2 w-1 h-1 bg-blue-500/30 rounded-full" />
      <div className="absolute top-2 right-2 w-1 h-1 bg-blue-500/30 rounded-full" />
      <div className="absolute bottom-2 left-2 w-1 h-1 bg-blue-500/30 rounded-full" />
      <div className="absolute bottom-2 right-2 w-1 h-1 bg-blue-500/30 rounded-full" />
    </>
  );
}

export const InputField = ({ label, placeholder, icon, type = "text", value, onChange }) => {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between">
        <label className="font-extrabold text-[18px] uppercase tracking-tight text-blue-500 group-focus-within:text-blue-400 transition-colors leading-none">{label}</label>
      </div>
      <div className="relative">
        {icon && (<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-500/20 group-focus-within:text-blue-500 transition-colors">{icon}</div>)}
        <input 
          type={type} 
          placeholder={placeholder}
          className={`w-full bg-black/50 border border-blue-500/40 hover:border-blue-500/40 focus:border-blue-500 focus:bg-blue-500/5 transition-all text-sm py-3.5 ${icon ? 'pl-11' : 'px-4'} pr-4 text-blue-100 placeholder:text-blue-900/30 focus:outline-none focus:ring-1 focus:ring-blue-500/10 rounded-none`}
          required
          autoComplete='off'
          maxLength={28}
          spellCheck="false"
          value={value}
          onChange={onChange}
        />
        <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-blue-500 group-focus-within:w-full transition-all duration-500" />
      </div>
    </div>
  );
}

export const HackerButton = ({ icon, label }) => {
  return (
    <button className="flex items-center justify-center space-x-2 bg-transparent border border-blue-500/20 hover:border-blue-500/60 hover:bg-blue-500/5 hover:text-[#3b82f6] text-blue-500/70 py-3 rounded-none transition-all font-bold text-[14px] tracking-widest">
      {icon}
      <span>{label}</span>
    </button>
  );
}

export const RenderUIPattern = () => {
    return (
        <div className="absolute top-10 right-10 text-blue-500/10 text-[9px] select-none pointer-events-none text-right hidden lg:block leading-relaxed">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="hover:text-blue-500/40 transition-colors uppercase">
            {`>> [${new Date().toISOString().split('T')[1].split('.')[0]}] NET_TRACE: #00${i} -- ADDR_0x${Math.random().toString(16).slice(2, 6)} -- OK`}
          </div>
        ))}
      </div>
    )
}

export const CompactRow = ({ label, value}) => {
  return (
    <div className="font-mono space-y-1 group flex flex-row gap-x-5 items-center">
      <div className="flex items-center space-x-2 text-gray-500 group-hover:text-blue-400 transition-colors">
        <span className="text-base font-bold uppercase tracking-widest">{label}:</span>
      </div>
      <div className={`text-base text-gray-300 bg-white/5 px-1 text-align rounded-sm border border-transparent group-hover:border-blue-500/10 transition-all`}>
        {value}
      </div>
    </div>
  );
}

export const LogLine = ({ time, type, msg, glow = true }) => {
  const colors = {
    WARNING: 'text-[#fcd34d]',
    CRITICAL: 'text-red-500',
  };
  return (
    <div className={`hover:cursor-pointer flex items-start space-x-3 py-0.5 group ${(glow && type === 'CRITICAL') ? 'bg-red-150/5' : 'bg-yellow-100/5'}`}>
      <span className="text-gray-300 w-25 flex-shrink-0">[{time}]</span>
      <span className={`w-25 ${colors[type] || 'text-white'}`}>{type}</span>
      <span className={`flex-1 ${(glow && type === 'CRITICAL') ? 'text-red-400' : 'text-[#fef08a]'}`}>{msg}</span>
      <ChevronRight size={20} className="text-[#2563eb] opacity-0 group-hover:opacity-100" />
    </div>
  );
}

export const Windows = ({ size = 16, className = '', ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <rect x="3" y="3" width="8" height="8" />
      <rect x="13" y="3" width="8" height="8" />
      <rect x="3" y="13" width="8" height="8" />
      <rect x="13" y="13" width="8" height="8" />
    </svg>
  );
};