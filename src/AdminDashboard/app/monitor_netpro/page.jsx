"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';

import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';

import { CircleAlert, ArrowDown01, ArrowUp01, ChevronLeft, ChevronRight, Network, ShieldAlert, Activity } from 'lucide-react';
import { AlwaysData, Hackaday, WireShark } from '../../helper/icons.jsx';

import { useDashboardSocket } from '../../hooks/useDashboardSocket.js';

const NetproPage = () => {
  const { logs: socketLogs, alerts: socketAlerts, isConnected, dbLogs, setDbLogs, fetchDbLogsViaSocket } = useDashboardSocket();
  const [agents, setAgents] = useState([]);

  // Lấy danh sách Agents từ API
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
          // Assume data is { success: true, data: [...] } or just [...]
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

  const uniqueAgentList = useMemo(() => {
    const apiAgentIds = agents.map(a => a.agent_id);
    const logAgentIds = [...new Set(socketLogs.map(log => log.agent_id))];
    return ['all', ...new Set([...apiAgentIds, ...logAgentIds])];
  }, [agents, socketLogs]);

  const [agentId, setAgentId] = useState("all");

  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState("24h");
  const [isLive, setIsLive] = useState(true);
  const [sortOrder, setSortOrder] = useState("desc");

  // State giữ lại logs hiển thị nếu tắt Live
  const [displayedLogs, setDisplayedLogs] = useState([]);
  const [displayedAlerts, setDisplayedAlerts] = useState([]);

  // Gửi request lấy historical db logs khi agentId thay đổi, socket kết nối, hoặc đổi chế độ live / khoảng thời gian
  useEffect(() => {
    if (isConnected) {
      setDbLogs([]); // Clear old state
      fetchDbLogsViaSocket('FETCH_NETPRO_LOGS', agentId, isLive ? undefined : timeRange);
    }
  }, [agentId, isConnected, isLive, timeRange, fetchDbLogsViaSocket, setDbLogs]);

  // Hợp nhất socketLogs (realtime) với dbLogs (historical) và lọc trùng
  const combinedLogs = useMemo(() => {
    const merged = [...socketLogs];
    const socketIds = new Set(socketLogs.map(l => l.id));
    dbLogs.forEach(log => {
      if (!socketIds.has(log.id)) {
        merged.push(log);
      }
    });
    return merged;
  }, [socketLogs, dbLogs]);

  useEffect(() => {
    if (isLive) {
      setDisplayedLogs(combinedLogs);
      setDisplayedAlerts(socketAlerts);
    } else {
      setDisplayedLogs(dbLogs);
    }
  }, [combinedLogs, dbLogs, socketAlerts, isLive]);

  const handleCycleAgent = (direction) => {
    const currentIndex = uniqueAgentList.indexOf(agentId);
    if (currentIndex === -1) return;

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= uniqueAgentList.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = uniqueAgentList.length - 1;

    setAgentId(uniqueAgentList[nextIndex]);
  };

  const getAgentName = (id) => {
    if (id === 'all') return 'ALL';
    const agent = agents.find(a => a.agent_id === id);
    return agent ? agent.hostname : id;
  };

  const filteredAndSortedLogs = useMemo(() => {
    return displayedLogs.filter((log) => {
      if (agentId !== 'all' && log.agent_id !== agentId) return false;

      const commStr = log.comm || "";
      const eventTypeStr = log.event_type || "";

      if (searchQuery && !commStr.toLowerCase().includes(searchQuery.toLowerCase()) && !eventTypeStr.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      return true;
    }).sort((a, b) => {
      const commA = a.comm || "";
      const commB = b.comm || "";
      if (sortOrder === "asc") return commA.localeCompare(commB);
      return commB.localeCompare(commA);
    });
  }, [displayedLogs, agentId, searchQuery, sortOrder]);

  const filteredAlerts = useMemo(() => {
    return displayedAlerts.filter((alert) => {
      if (agentId !== 'all' && alert.agent_id !== agentId) return false;
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [displayedAlerts, agentId]);

  const alertMetrics = useMemo(() => {
    const now = new Date();
    let stats = { min1: 0, min30: 0, min60: 0, day1: 0, day30: 0 };

    displayedAlerts.forEach((alert) => {
      if (agentId !== 'all' && alert.agent_id !== agentId) return;

      const alertTime = new Date(alert.timestamp);
      const diffMs = Math.abs(now - alertTime);
      const diffMins = diffMs / (1000 * 60);
      const diffDays = diffMins / (60 * 24);

      if (diffMins <= 1) stats.min1++;
      if (diffMins <= 30) stats.min30++;
      if (diffMins <= 60) stats.min60++;
      if (diffDays <= 1) stats.day1++;
      if (diffDays <= 30) stats.day30++;
    });

    return stats;
  }, [displayedAlerts, agentId]);

  return (
    <div className="w-full flex h-screen overflow-hidden bg-[#0A0A0A] text-[#E0E0E0] font-sans">
      <SideBar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AppHeader route={'security/netpro'} />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[160px]" />
          <div className="scanline opacity-10" />
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-4 relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-full space-y-5"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-none mb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full">
                  <AlwaysData />
                </div>
                <div>
                  <h3 className="text-md font-bold font-mono uppercase tracking-widest text-gray-400">NETWORK & PROCCESS {isConnected ? <span className="text-green-500 text-xs ml-2">● CONNECTED</span> : <span className="text-red-500 text-xs ml-2">● DISCONNECTED</span>}</h3>
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
                      <span className="text-md font-bold tracking-widest text-blue-500 uppercase font-mono">Search</span>
                      <input
                        type="text"
                        placeholder="Enter name or event..."
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
                  <div className="overflow-auto max-h-[400px] 
                    [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 
                    [&::-webkit-scrollbar-track]:bg-[#080808] 
                    [&::-webkit-scrollbar-thumb]:bg-[#222] 
                    hover:[&::-webkit-scrollbar-thumb]:bg-blue-600/50">
                    <table className="w-full text-left border-collapse font-mono text-md whitespace-nowrap">
                      <thead className="sticky top-0 z-20 bg-[#141414]">
                        <tr className="border-b border-[#232323] text-blue-600 font-bold uppercase tracking-wider">
                          <th className="py-3 px-4 cursor-pointer hover:bg-[#1c1c1c] transition-colors" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                            <div className="flex items-center gap-2">
                              CMD
                              <span className="text-gray-500">{sortOrder === "asc" ? <ArrowDown01 size={18} /> : <ArrowUp01 size={18} />}</span>
                            </div>
                          </th>
                          <th className="py-3 px-4">Event Type</th>
                          <th className="py-3 px-4">Src IP</th>
                          <th className="py-3 px-4">Des IP</th>
                          <th className="py-3 px-4">PID</th>
                          <th className="py-3 px-4">UID</th>
                          <th className="py-3 px-4">Protocol</th>
                          <th className="py-3 px-4">Sport</th>
                          <th className="py-3 px-4">Dport</th>
                          <th className="py-3 px-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-1 divide-transparent [&>tr:hover]:bg-blue-950/30 transition-colors">
                        {filteredAndSortedLogs.length > 0 ? (
                          filteredAndSortedLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-[#121212] transition-colors group">
                              <td className="py-3 px-4 text-white font-semibold group-hover:text-blue-400 transition-colors">
                                {log.comm}
                              </td>
                              <td className="py-3 px-4 text-white">{log.event_type}</td>
                              <td className="py-3 px-4 text-white">{log.saddr || log.src_ip}</td>
                              <td className="py-3 px-4 text-white">{log.daddr || log.dest_ip}</td>
                              <td className="py-3 px-4 text-white">{log.pid}</td>
                              <td className="py-3 px-4 text-white">{log.uid || log._uid}</td>
                              <td className="py-3 px-4">
                                <span className="bg-[#1B263B]/30 border border-blue-900/50 px-2 py-0.5 text-sm text-blue-400 font-bold">
                                  {log.protocol}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-white">{log.sport || "-"}</td>
                              <td className="py-3 px-4 text-white">{log.dport || "-"}</td>
                              <td className="py-3 px-4 text-white">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString("vi-VN") : "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="10" className="py-16 h-30 text-center text-red-400 uppercase font-bold tracking-widest text-md">
                              <div className="flex items-center justify-center gap-2">
                                <CircleAlert size={16} />
                                Oops, no logs found
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
                    Found: <span className="text-blue-400">{filteredAndSortedLogs.length}</span> result{filteredAndSortedLogs.length > 1 ? "s" : ""}
                  </div>
                </div>

              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[5fr_1fr] gap-5">
              <div className="bg-[#0D0D0D]/80 backdrop-blur-xl border border-[#2A2A2A] rounded-none p-1 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500/40 group-hover:border-red-500 transition-colors duration-500" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500/40 group-hover:border-red-500 transition-colors duration-500" />

                <div className="bg-[#111] p-4 border border-[#232323] space-y-4">
                  <div className="flex items-center gap-2 pb-2">
                    <Hackaday />
                    <span className="text-md font-bold font-mono text-red-400 uppercase tracking-wider">Alerts</span>
                  </div>

                  <div className="border border-[#232323] bg-[#0A0A0A]/40 overflow-hidden">
                    <div className="overflow-auto max-h-[280px] 
                      [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 
                      [&::-webkit-scrollbar-track]:bg-[#080808] 
                      [&::-webkit-scrollbar-thumb]:bg-[#222] 
                      hover:[&::-webkit-scrollbar-thumb]:bg-red-600/50">
                      <table className="w-full text-left border-collapse font-mono text-md">
                        <thead className="sticky top-0 z-20 bg-[#141414]">
                          <tr className="text-sm border-b border-[#232323] text-red-500 font-bold uppercase tracking-wider">
                            <th className="py-2 px-3 w-100">Details</th>
                            <th className="py-2 px-3 w-10">Level</th>
                            <th className="py-2 px-3 w-20">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-0 divide-[#1C1C1C]">
                          {filteredAlerts.length > 0 ? (
                            filteredAlerts.map((alert) => (
                              <tr key={alert.id} className="hover:bg-red-950/20 transition-colors">
                                <td className="py-2.5 px-3 text-sm text-white font-semibold">{alert.rule_name}</td>
                                <td className="py-3 px-3">
                                  <span className={`text-sm font-bold px-1.5 py-0.5 ${alert.severity === "CRITICAL" ? "bg-red-900 text-red-500" :
                                    alert.severity === "HIGH" ? "bg-yellow-950 text-yellow-300 border border-yellow-900/40" :
                                      "bg-amber-950 text-amber-400 border border-amber-900/40"
                                    }`}>
                                    {alert.severity}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-white text-sm">
                                  {alert.timestamp ? new Date(alert.timestamp).toLocaleString("vi-VN") : "-"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="3" className="py-12 text-center text-gray-600 uppercase font-bold tracking-widest">
                                No Alerts
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0D0D0D]/80 backdrop-blur-xl border border-[#2A2A2A] rounded-none p-1 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500/40 group-hover:border-blue-500 transition-colors duration-500" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500/40 group-hover:border-blue-500 transition-colors duration-500" />

                <div className="bg-[#111] p-4 border border-[#232323] space-y-4">
                  <div className="flex items-center gap-2 pb-2">
                    <WireShark />
                    <span className="text-md font-bold font-mono text-blue-600 uppercase tracking-wider">Alert traffic</span>
                  </div>

                  <div className="border border-[#232323] bg-[#0A0A0A]/40 overflow-hidden">
                    <table className="w-full text-left border-collapse font-mono text-md">
                      <thead>
                        <tr className="text-sm bg-[#141414] border-b border-[#232323] text-blue-600 font-bold uppercase tracking-wider">
                          <th className="py-1 px-2">Timeline</th>
                          <th className="py-1 px-2 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y-1 divide-[#1C1C1C] bg-[#111]/20">
                        <tr className="hover:bg-blue-950/20 transition-colors">
                          <td className="py-3 px-2 text-white font-medium">Last 1Min</td>
                          <td className="py-3 px-2 text-right font-bold text-white">
                            <span className={alertMetrics.min1 > 0 ? "text-red-400 animate-pulse font-black" : "text-white"}>{alertMetrics.min1}</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-blue-950/20 transition-colors">
                          <td className="py-3 px-2 text-white font-medium">Last 30Min</td>
                          <td className="py-3 px-2 text-right font-bold text-white">{alertMetrics.min30}</td>
                        </tr>
                        <tr className="hover:bg-blue-950/20 transition-colors">
                          <td className="py-3 px-2 text-white font-medium">Last 60Min</td>
                          <td className="py-3 px-2 text-right font-bold text-white">{alertMetrics.min60}</td>
                        </tr>
                        <tr className="hover:bg-blue-950/20 transition-colors">
                          <td className="py-3 px-2 text-white font-medium">Last 24H</td>
                          <td className="py-3 px-2 text-right font-bold text-white">{alertMetrics.day1}</td>
                        </tr>
                        <tr className="hover:bg-blue-950/20 transition-colors">
                          <td className="py-3 px-2 text-white font-medium">Last 30D</td>
                          <td className="py-3 px-2 text-right font-bold text-white">{alertMetrics.day30}</td>
                        </tr>
                      </tbody>
                    </table>
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

export default NetproPage;