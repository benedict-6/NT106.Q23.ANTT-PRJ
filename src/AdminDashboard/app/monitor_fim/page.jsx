'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Search, Clock, Activity, ShieldCheck, CircleAlert, ChevronLeft, ChevronRight } from 'lucide-react';

import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';
import { LibreWolf } from '../../helper/icons.jsx';
import { useDashboardSocket } from '../../hooks/useDashboardSocket.js';

export default function FimDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const { logs: socketLogs, isConnected } = useDashboardSocket();
  const [displayedLogs, setDisplayedLogs] = useState([]);
  
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('1d'); 
  const [isLive, setIsLive] = useState(true);

  const [agents, setAgents] = useState([]);
  const [fimLogs, setFimLogs] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setMounted(true);

    const fetchAgents = async () => {
       const masterUrl = process.env.NEXT_PUBLIC_MASTER_URL || "http://localhost:3000";
       try {
         const res = await fetch(`${masterUrl}/api/dashboard/agents`, {
            headers: { 'Authorization': `Bearer ${token}` }
         });
         if (res.ok) {
            const data = await res.json();
            setAgents(data.agents || []);
         }
       } catch (error) {
         console.error("Error loading agent: ", error);
       }
    };

    fetchAgents();
  }, [router]);

  useEffect(() => {
    if (isLive) {
      setDisplayedLogs(socketLogs.filter(log => log.type === 'file_integrity'));
    }
  }, [socketLogs, isLive]);

  const agentTabs = useMemo(() => {
    const listFromLogs = [...new Set(displayedLogs.map(log => log.agent_id))];
    const listFromApi = agents.map(a => a.agent_id);
    return ['all', ...new Set([...listFromApi, ...listFromLogs])].slice(0, 4); // Limit to 3 agents + 'all'
  }, [agents, displayedLogs]);

  const handleCycleAgent = (direction) => {
    const currentIndex = agentTabs.indexOf(selectedAgent);
    if (currentIndex === -1) return;
    
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= agentTabs.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = agentTabs.length - 1;
    
    setSelectedAgent(agentTabs[nextIndex]);
  };

  // Removed mock setInterval

  const filteredLogs = useMemo(() => {
    return displayedLogs.filter(log => {
      const matchesAgent = selectedAgent === 'all' || log.agent_id === selectedAgent;
      const matchesSearch = log.file_path?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            log.event_type?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesAgent && matchesSearch;
    });
  }, [displayedLogs, selectedAgent, searchQuery]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A] text-[#E0E0E0] font-sans selection:bg-blue-500/30">
      <SideBar />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AppHeader route={"security/fim"} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[160px]" />
          <div className="scanline opacity-10" />
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-4 relative z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-full mx-auto space-y-5"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-none mb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full">
                  <LibreWolf/>
                </div>
                <div>
                  <h3 className="text-md font-bold font-mono uppercase tracking-widest text-gray-400">FIM {isConnected ? <span className="text-green-500 text-xs ml-2">● CONNECTED</span> : <span className="text-red-500 text-xs ml-2">● DISCONNECTED</span>}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleCycleAgent('prev')}
                  className="bg-[#141414] hover:bg-[#1C1C1C] border-none text-gray-400 hover:text-white p-1 transition-colors duration-200"
                  title="Previous Agent"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex flex-wrap gap-2 bg-[#050505] p-1 border-none">
                  {agentTabs.map((id) => (
                    <button
                      key={id}
                      onClick={() => setSelectedAgent(id)}
                      className={`px-4 py-1.5 font-mono text-md font-bold transition-all duration-300 rounded-none uppercase ${
                        selectedAgent === id
                          ? "bg-blue-600 text-white border-b-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                          : "bg-transparent text-gray-500 border border-transparent hover:text-gray-300 hover:bg-[#111]"
                      }`}
                    >
                      {id === 'all' ? 'ALL' : id}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleCycleAgent('next')}
                  className="bg-[#141414] hover:bg-[#1C1C1C] border-none text-gray-400 hover:text-white p-1 transition-colors duration-200"
                  title="Next Agent"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="bg-[#0D0D0D]/80 backdrop-blur-xl border border-[#2A2A2A] rounded-none p-1 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500/40 group-hover:border-blue-500 transition-colors duration-500" />
              <div className="absolute top-0 right-0 w-2 h-8 bg-blue-500/10" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500/40 group-hover:border-blue-500 transition-colors duration-500" />
              
              <div className="bg-[#111] p-6 border border-[#232323] space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
                  <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    
                    <div className="flex flex-col gap-2">
                      <span className="text-md font-bold tracking-widest text-blue-500 uppercase font-mono">Time Interval</span>
                      <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-none px-3 py-1.5 text-md text-gray-300 font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="1m">&gt; Last 1Min</option>
                        <option value="60m">&gt; Last 60Min</option>
                        <option value="1d">&gt; Last 24H</option>
                        <option value="30d">&gt; Last 30D</option>
                        <option value="90d">&gt; Last 90D</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-2 w-full sm:w-64">
                      <span className="text-md font-bold tracking-widest text-blue-500 uppercase font-mono">Search</span>
                      <input
                        type="text"
                        placeholder="Enter file path or event..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-none px-3 py-1.5 text-md text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-center self-end md:self-center">
                    <button
                      onClick={() => setIsLive(!isLive)}
                      className={`flex items-center gap-2 px-3 py-1.5 border text-md font-bold font-mono tracking-wider transition-all duration-300 rounded-none ${
                        isLive 
                          ? "bg-green-950/20 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.15)]" 
                          : "bg-[#0A0A0A] border-[#2A2A2A] text-red-400"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-red-500"}`} />
                      {isLive ? "LIVE: ON" : "LIVE: OFF"}
                    </button>
                  </div>
                </div>

                <div className="border border-[#232323] bg-[#0A0A0A]/40 overflow-hidden">
                  <div className="overflow-auto max-h-[400px] custom-scrollbar">
                    <table className="max-w-full text-left border-collapse font-mono text-md">
                      <thead>
                        <tr className="bg-[#141414] border-b border-[#232323] text-blue-600 font-bold uppercase tracking-wider sticky top-0 z-10">
                          <th className="py-3 px-4 w-40">Agent ID</th>
                          <th className="py-3 px-4 w-1/3">File Path</th>
                          <th className="py-3 px-4 w-20">Type</th>
                          <th className="py-3 px-4 w-60">Timestamp</th>
                          <th className="py-3 px-4 text-left w-20">Size(B)</th>
                          <th className="py-3 px-4 text-left w-28">UID</th>
                          <th className="py-3 px-4 text-left w-28">GID</th>
                          <th className="py-3 px-4 text-left w-28">Permission</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-1 divide-transparent [&>tr:hover]:bg-blue-950/30 transition-colors">
                        {filteredLogs.length > 0 ? (
                          filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-[#121212] transition-colors group">
                              <td className="py-3 px-4">
                                <span className="bg-[#1B263B]/30 border border-blue-900/50 px-2 py-0.5 text-yellow-300 font-bold">
                                  {log.agent_id}
                                </span>
                              </td>
                              
                              <td className="py-3 px-4 text-white font-semibold group-hover:text-blue-400 transition-colors truncate max-w-xs" title={log.file_path}>
                                {log.file_path}
                              </td>
                              
                              <td className="py-3 px-4">
                                <span className={`text-md font-bold px-2 py-0.5 border ${
                                  log.event_type === 'MODIFIED' ? 'bg-orange-950/40 text-orange-400 border border-orange-900/40' :
                                  log.event_type === 'DELETED' ? 'bg-red-950/40 text-red-400 border border-red-900/40' :
                                  'bg-green-950/40 text-green-400 border border-green-900/40'
                                }`}>
                                  {log.event_type}
                                </span>
                              </td>
                     
                              <td className="py-3 px-4 text-gray-400">
                                {new Date(log.timestamp).toLocaleString("vi-VN", { timeZone: "UTC" })}
                              </td>
                              
                              <td className="py-3 px-4 text-gray-400">
                                {log.size?.toLocaleString() || '0'}
                              </td>

                              <td className="py-3 px-4 text-gray-400">
                                {log.uid}
                              </td>
                              <td className="py-3 px-4 text-gray-400">
                                {log.gid}
                              </td>
                              <td className="py-3 px-4">
                                {log.permission ? (
                                  <span className="text-[#e11d48] bg-red-950/40 px-1.5 py-0.5 font-bold border border-red-900/40">
                                    {log.permission}
                                  </span>
                                ) : (
                                  <span className="text-gray-600 italic">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="py-16 h-30 text-center text-red-400 uppercase font-bold tracking-widest text-md">
                              <div className="flex items-center justify-center gap-2">
                                <CircleAlert size={16} /> 
                                No integrity logs matching filters found
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-between items-center text-md font-mono text-gray-600 uppercase tracking-wider pt-2">
                  <div>
                    Found: <span className="text-blue-400">{filteredLogs.length}</span> result{filteredLogs.length > 1 ? "s" : ""}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}