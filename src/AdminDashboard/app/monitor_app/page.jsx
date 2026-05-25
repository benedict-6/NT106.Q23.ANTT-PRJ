'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';

import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';

import { CircleAlert, ArrowDown01, ArrowUp01, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppStore } from '../../helper/icons.jsx';

import { useDashboardSocket } from '../../hooks/useDashboardSocket.js';

const ApplicationsPage = () => {
  const { logs: socketLogs, isConnected, dbLogs, setDbLogs, fetchDbLogsViaSocket } = useDashboardSocket();
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    const fetchAgents = async () => {
      const token = localStorage.getItem('token');
      const masterUrl = process.env.NEXT_PUBLIC_MASTER_URL || "http://localhost:3000";
      try {
        const res = await fetch(`${masterUrl}/api/dashboard/agents`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setAgents(data);
          else if (data.agents && Array.isArray(data.agents)) setAgents(data.agents);
          else if (data.data && Array.isArray(data.data)) setAgents(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch agents", err);
      }
    };
    fetchAgents();
  }, []);

  const [displayedApps, setDisplayedApps] = useState([]);

  const uniqueAgentList = useMemo(() => {
    const listFromLogs = [...new Set(displayedApps.map(app => app.agent_id))];
    const listFromApi = agents.map(a => a.agent_id);
    return [...new Set([...listFromApi, ...listFromLogs])];
  }, [agents, displayedApps]);

  const [agentId, setAgentId] = useState("");
  useEffect(() => {
    if (!agentId && uniqueAgentList.length > 0) {
      setAgentId(uniqueAgentList[0]);
    }
  }, [uniqueAgentList, agentId]);

  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState("24h");
  const [isLive, setIsLive] = useState(true);
  const [sortOrder, setSortOrder] = useState("asc");

  // Gửi request lấy historical db applications khi agentId thay đổi, socket kết nối, hoặc đổi chế độ live / khoảng thời gian
  useEffect(() => {
    if (agentId && isConnected) {
      setDbLogs([]); // Clear old state
      fetchDbLogsViaSocket('FETCH_APPLICATIONS', agentId, isLive ? undefined : timeRange);
    }
  }, [agentId, isConnected, isLive, timeRange, fetchDbLogsViaSocket, setDbLogs]);

  // Hợp nhất socketLogs (realtime) với dbLogs (historical) và lọc trùng
  const combinedApps = useMemo(() => {
    const liveAppsMapped = socketLogs.filter(log => log.type === 'software_list').map(log => ({
      id: log.id,
      agent_id: log.agent_id,
      name: log.name || log.software_name || 'Unknown',
      version: log.version || log._version || 'Unknown',
      last_time_pull: log.timestamp || new Date().toISOString(),
      cves: log.cves || []
    }));

    const dbAppsMapped = dbLogs.map(log => ({
      id: log.id || log.app_id,
      agent_id: log.agent_id,
      name: log.software_name || 'Unknown',
      version: log._version || 'Unknown',
      last_time_pull: log._timestamp || new Date().toISOString(),
      cves: log.cves || []
    }));

    const merged = [...liveAppsMapped];
    const liveNames = new Set(liveAppsMapped.map(app => app.name.toLowerCase()));

    dbAppsMapped.forEach(app => {
      if (!liveNames.has(app.name.toLowerCase())) {
        merged.push(app);
      }
    });

    return merged;
  }, [socketLogs, dbLogs]);

  useEffect(() => {
    if (isLive) {
      setDisplayedApps(combinedApps);
    } else {
      const dbAppsMapped = dbLogs.map(log => ({
        id: log.id || log.app_id,
        agent_id: log.agent_id,
        name: log.software_name || 'Unknown',
        version: log._version || 'Unknown',
        last_time_pull: log._timestamp || new Date().toISOString(),
        cves: log.cves || []
      }));
      setDisplayedApps(dbAppsMapped);
    }
  }, [combinedApps, dbLogs, isLive]);

  const handleCycleAgent = (direction) => {
    const currentIndex = uniqueAgentList.indexOf(agentId);
    if (currentIndex === -1) return;

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= uniqueAgentList.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = uniqueAgentList.length - 1;

    setAgentId(uniqueAgentList[nextIndex]);
  };

  const getAgentName = (id) => {
    const agent = agents.find(a => a.agent_id === id);
    return agent ? agent.hostname : id;
  };

  const filteredAndSortedData = useMemo(() => {
    return displayedApps.filter((app) => {
      if (app.agent_id !== agentId) return false;
      if (searchQuery && !app.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      if (sortOrder === "asc") return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });
  }, [displayedApps, agentId, searchQuery, sortOrder]);

  const customScrollbarClasses = `
    [&::-webkit-scrollbar]:w-2 
    [&::-webkit-scrollbar]:h-2 
    [&::-webkit-scrollbar-track]:bg-[#050505] 
    [&::-webkit-scrollbar-thumb]:bg-blue-950/60 
    [&::-webkit-scrollbar-thumb]:border 
    [&::-webkit-scrollbar-thumb]:border-blue-500/30
    hover:[&::-webkit-scrollbar-thumb]:bg-blue-500
    [&::-webkit-scrollbar-thumb]:transition-colors
  `;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A] text-[#E0E0E0] font-sans">
      <SideBar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AppHeader route={'security/apps'} />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[160px]" />
          <div className="scanline opacity-10" />
        </div>

        <div className={`flex-1 overflow-y-auto p-6 relative z-10 w-full ${customScrollbarClasses}`}>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-7xl mx-auto space-y-5"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-none mb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full">
                  <AppStore />
                </div>
                <div>
                  <h3 className="text-md font-bold font-mono uppercase tracking-widest text-gray-400">Apps {isConnected ? <span className="text-green-500 text-xs ml-2">● CONNECTED</span> : <span className="text-red-500 text-xs ml-2">● DISCONNECTED</span>}</h3>
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
                  {uniqueAgentList.map((id) => (
                    <button
                      key={id}
                      onClick={() => setAgentId(id)}
                      className={`px-4 py-1.5 font-mono text-md font-bold transition-all duration-300 rounded-none uppercase ${agentId === id
                        ? "bg-blue-600 text-white border-b-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                        : "bg-transparent text-gray-500 border border-transparent hover:text-gray-300 hover:bg-[#111]"
                        }`}
                    >
                      {getAgentName(id)}
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
                        disabled={isLive}
                        className={`bg-[#0A0A0A] border border-[#2A2A2A] rounded-none px-3 py-1.5 text-md text-gray-300 font-mono focus:outline-none focus:border-blue-500 cursor-pointer ${isLive ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="1m">Last 1 minute</option>
                        <option value="30m">Last 30 minutes</option>
                        <option value="24h">Last 24 hours</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-2 w-full sm:w-64">
                      <span className="text-md font-bold tracking-widest text-blue-500 uppercase font-mono">Search app</span>
                      <input
                        type="text"
                        placeholder="Enter app name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-none px-3 py-1.5 text-md text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center self-end md:self-center">
                    <button
                      onClick={() => setIsLive(!isLive)}
                      className={`flex items-center gap-2 px-3 py-1.5 border text-md font-bold font-mono tracking-wider transition-all duration-300 rounded-none ${isLive
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
                  <div className={`overflow-x-auto overflow-y-auto max-h-[480px] ${customScrollbarClasses}`}>
                    <table className="w-full text-left border-collapse font-mono text-md whitespace-nowrap">
                      <thead>
                        <tr className="sticky top-0 bg-[#141414] border-b border-[#232323] text-blue-600 font-bold uppercase tracking-wider z-10 shadow-[0_1px_0_0_#232323]">
                          <th className="py-3 px-4 w-30">Agent id</th>
                          <th className="py-3 px-4 w-60 cursor-pointer hover:bg-[#1c1c1c] transition-colors" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                            <div className="flex items-center gap-2">
                              App name
                              <span className="text-gray-500">{sortOrder === "asc" ? <ArrowDown01 size={18} /> : <ArrowUp01 size={18} />}</span>
                            </div>
                          </th>
                          <th className="py-3 px-4 w-20">Version</th>
                          <th className="py-3 px-4 w-40">Last Time Pull</th>
                          <th className="py-3 px-4 text-left w-90">CVE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-1 divide-transparent [&>tr:hover]:bg-blue-950/30 transition-colors">
                        {filteredAndSortedData.length > 0 ? (
                          filteredAndSortedData.map((app) => (
                            <tr key={app.id} className="hover:bg-[#121212] transition-colors group">
                              <td className="py-3 px-4">
                                <span className="bg-[#1B263B]/30 border border-blue-900/50 px-2 py-0.5 text-md text-yellow-300 font-bold">
                                  {getAgentName(app.agent_id)}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-white font-semibold group-hover:text-blue-400 transition-colors">
                                {app.name}
                              </td>

                              <td className="py-3 px-4 text-white">
                                {app.version}
                              </td>

                              <td className="py-3 px-4 text-white">
                                {new Date(app.last_time_pull).toLocaleString("vi-VN", { timeZone: "UTC" })}
                              </td>

                              <td className="py-3 px-4 text-left">
                                {app.cves.length > 0 ? (
                                  <div className="flex flex-wrap justify-start gap-2">
                                    {app.cves.map((cve) => (
                                      <span
                                        key={cve}
                                        className="text-md font-bold bg-red-950/40 text-red-400 border border-red-900/40 px-1.5 py-0.5"
                                      >
                                        {cve}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-md font-bold bg-green-950/20 text-green-500 border border-green-900/30 px-2 py-0.5">
                                    SECURE
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="py-16 h-30 text-center text-red-400 uppercase font-bold tracking-widest text-md">
                              <div className="flex items-center justify-center gap-2">
                                <CircleAlert size={16} />
                                Oops, no apps found
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
                    Found: <span className="text-blue-400">{filteredAndSortedData.length}</span> result{filteredAndSortedData.length > 1 ? "s" : ""}
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

export default ApplicationsPage;