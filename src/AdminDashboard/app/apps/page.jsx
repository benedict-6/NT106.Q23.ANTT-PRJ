'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, Activity, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react';

import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';

export const DashboardCard = ({ title, children, className = '' }) => (
  <div className={`bg-[#111111] border border-[#2A2A2A] rounded-xl p-5 flex flex-col shadow-lg ${className}`}>
    <div className="flex items-center justify-between mb-4 border-b border-[#2A2A2A]/50 pb-3">
      <h3 className="text-[15px] font-bold text-gray-200 tracking-wide">{title}</h3>
    </div>
    {children}
  </div>
);

const generateMockApps = () => {
    return [
        { id: 1, agent_id: 'agent1', name: 'OpenSSH', version: '8.9p1-3ubuntu0.1', architecture: 'amd64', vendor: 'Ubuntu Developers', cve_name: 'CVE-2023-38408' },
        { id: 2, agent_id: 'agent1', name: 'nginx', version: '1.18.0-6ubuntu14.4', architecture: 'amd64', vendor: 'Ubuntu Developers', cve_name: null },
        { id: 3, agent_id: 'agent2', name: 'python3', version: '3.10.6-1~22.04', architecture: 'amd64', vendor: 'Python Software Foundation', cve_name: null },
        { id: 4, agent_id: 'agent3', name: 'apache2', version: '2.4.52-1ubuntu4.6', architecture: 'amd64', vendor: 'Apache Software Foundation', cve_name: 'CVE-2023-25690' },
        { id: 5, agent_id: 'agent2', name: 'mysql-server', version: '8.0.35-0ubuntu0.22.04.1', architecture: 'amd64', vendor: 'MySQL', cve_name: null },
        { id: 6, agent_id: 'agent1', name: 'sudo', version: '1.9.9-1ubuntu2.4', architecture: 'amd64', vendor: 'Todd C. Miller', cve_name: 'CVE-2023-22809' },
        { id: 7, agent_id: 'agent3', name: 'curl', version: '7.81.0-1ubuntu1.14', architecture: 'amd64', vendor: 'Daniel Stenberg', cve_name: null },
        { id: 8, agent_id: 'agent2', name: 'bash', version: '5.1-6ubuntu1', architecture: 'amd64', vendor: 'Free Software Foundation', cve_name: null },
    ];
};

export default function ApplicationMonitor() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('1d'); 
  const [isLive, setIsLive] = useState(false);

  const [agents, setAgents] = useState([]);
  const [appList, setAppList] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    setMounted(true);

    const fetchData = async () => {
       const masterUrl = process.env.NEXT_PUBLIC_MASTER_URL || "http://localhost:3000";
       const headers = { 'Authorization': `Bearer ${token}` };
       try {
         const agentRes = await fetch(`${masterUrl}/api/dashboard/agents`, { headers });
         if (agentRes.ok) {
            const agentData = await agentRes.json();
            setAgents(agentData.agents || []);
         }
       } catch (error) {
         console.error("Lỗi kéo data: ", error);
       }
       
       setAppList(generateMockApps());
    };
    fetchData();
  }, [router]);

  const filteredApps = useMemo(() => {
      let result = [...appList];
      
      if (selectedAgent !== 'all') {
          result = result.filter(app => app.agent_id === selectedAgent);
      }

      if (searchQuery) {
          result = result.filter(app => app.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      return result;
  }, [appList, searchQuery, selectedAgent]);

  if (!mounted) return null;

  return (
    <div className="flex bg-[#050505] min-h-screen text-white font-sans selection:bg-blue-500/30">
      <SideBar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <AppHeader route={['Applications', 'Software Inventory']} />
        
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="max-w-7xl mx-auto space-y-6">
            
            <div className="flex flex-col xl:flex-row xl:items-center justify-between bg-[#111111] p-4 rounded-xl border border-[#2A2A2A] shadow-md gap-4">
                
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-[#0a0a0a] px-3 py-2 rounded-lg border border-[#2A2A2A]">
                        <Layers size={16} className="text-blue-500" />
                        <select 
                            className="bg-transparent text-sm text-gray-200 outline-none cursor-pointer font-bold w-40 truncate"
                            value={selectedAgent}
                            onChange={(e) => setSelectedAgent(e.target.value)}
                        >
                            <option value="all" className="bg-[#111]">Tất cả Agents</option>
                            {agents.map(a => (
                                <option key={a.agent_id} value={a.agent_id} className="bg-[#111]">
                                    {a.description || a.agent_id}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center space-x-2 bg-[#0a0a0a] px-3 py-2 rounded-lg border border-[#2A2A2A] w-64 focus-within:border-blue-500 transition-colors">
                        <Search size={16} className="text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm ứng dụng..." 
                            className="bg-transparent border-none outline-none text-sm w-full text-gray-200 placeholder-gray-600"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center bg-[#0a0a0a] p-1 rounded-lg border border-[#2A2A2A]">
                        <Clock size={16} className="text-gray-500 ml-2 mr-1" />
                        {['1m', '60m', '1d', '30d', '90d'].map((range) => (
                            <button 
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                    timeRange === range ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
                                }`}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-px bg-[#2A2A2A]"></div>

                    <button 
                        onClick={() => setIsLive(!isLive)}
                        className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg font-bold text-sm transition-all border ${
                            isLive 
                            ? 'bg-red-500/10 border-red-500/50 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                            : 'bg-[#0a0a0a] border-[#2A2A2A] text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        <Activity size={16} className={isLive ? 'animate-pulse' : ''} />
                        <span>{isLive ? 'LIVE ON' : 'LIVE OFF'}</span>
                    </button>
                </div>
            </div>

            <DashboardCard title="Software Inventory & Vulnerabilities" className="h-[calc(100vh-220px)]">
                <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 bg-[#111111] z-10 shadow-sm">
                            <tr className="border-b border-[#2A2A2A] text-gray-500 font-mono text-xs uppercase tracking-wider">
                                <th className="py-3 px-4 font-bold w-1/4">Application Name</th>
                                <th className="py-3 px-2 font-bold w-1/5">Version</th>
                                <th className="py-3 px-2 font-bold text-center">Architecture</th>
                                <th className="py-3 px-2 font-bold">Vendor</th>
                                <th className="py-3 px-2 font-bold text-center w-1/5">Vulnerability (CVE)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]">
                            {filteredApps.length > 0 ? filteredApps.map((app) => (
                                <tr key={app.id} className="hover:bg-[#1A1A1A] transition-colors group">
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-[14px] text-gray-200 flex items-center space-x-2">
                                            <Layers size={14} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                                            <span>{app.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2">
                                        <span className="font-mono text-[12px] text-gray-400 bg-[#0a0a0a] px-2 py-1 rounded border border-[#2A2A2A]">
                                            {app.version}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-center text-gray-400 font-mono text-xs uppercase">
                                        {app.architecture}
                                    </td>
                                    <td className="py-3 px-2 text-gray-400 text-xs">
                                        {app.vendor}
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                        {app.cve_name ? (
                                            <div className="inline-flex items-center space-x-1.5 bg-red-500/10 text-red-500 border border-red-500/30 px-2.5 py-1 rounded-md cursor-pointer hover:bg-red-500/20 transition-colors" title="Cảnh báo phần mềm có lỗ hổng">
                                                <ShieldAlert size={14} />
                                                <span className="font-mono text-xs font-bold">{app.cve_name}</span>
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center space-x-1.5 bg-green-500/10 text-green-500 border border-green-500/30 px-2.5 py-1 rounded-md opacity-70">
                                                <CheckCircle2 size={14} />
                                                <span className="font-mono text-xs font-bold">Secure</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-gray-500 font-mono text-sm">
                                        Không tìm thấy ứng dụng nào khớp với điều kiện tìm kiếm.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </DashboardCard>
            
          </div>
        </main>
      </div>
    </div>
  );
}
