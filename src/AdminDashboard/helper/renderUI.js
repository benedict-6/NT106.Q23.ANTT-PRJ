import { Check } from "lucide-react"; 

export const SidebarIcon = ({ icon, active = false, onClick }) => {
  return (
    <div 
      className={`p-2.5 rounded cursor-pointer transition-colors ${active ? 'bg-[#1D2B3F] text-blue-400' : 'text-gray-500 hover:text-white hover:bg-[#1A1A1A]'}`}
      onClick={onClick}
    >
      {icon}
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
      <div className="flex-1 min-h-0">{children}</div>
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
      className={`flex items-center space-x-2 px-4 py-1 rounded transition-all text-base font-bold uppercase tracking-widest ${
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
      <tr className="border-b border-[#2A2A2A] text-[#1d4ed8] text-base uppercase font-bold tracking-wide">
        {columns.map((c, i) => (
          <th key={i} className={`py-4 ${i === 0 ? 'px-4' : ''} ${i === columns.length - 1 ? 'text-left px-5' : ''}`}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}
