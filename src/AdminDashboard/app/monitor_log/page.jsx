"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';

import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';

import { CircleAlert, ArrowDown01, ArrowUp01, ChevronLeft, ChevronRight } from 'lucide-react';
import { Hackaday, Files, Graph } from '../../helper/icons.jsx';

import { useDashboardSocket } from '../../hooks/useDashboardSocket.js';

// removed CURRENT_ANCHOR_TIME
const NetproPage = () => {
  const { logs: socketLogs, alerts: socketAlerts, isConnected, dbLogs, setDbLogs, fetchDbLogsViaSocket } = useDashboardSocket();
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

  const [displayedLogs, setDisplayedLogs] = useState([]);
  const [displayedAlerts, setDisplayedAlerts] = useState([]);

  const uniqueAgentList = useMemo(() => {
    const listFromLogs = [...new Set(displayedLogs.map(log => log.agent_id))];
    const listFromApi = agents.map(a => a.agent_id);
    return [...new Set([...listFromApi, ...listFromLogs])];
  }, [agents, displayedLogs]);

  const [agentId, setAgentId] = useState("");

  useEffect(() => {
    if (!agentId && uniqueAgentList.length > 0) {
      setAgentId(uniqueAgentList[0]);
    }
  }, [uniqueAgentList, agentId]);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState("24h");
  const [isLive, setIsLive] = useState(true);
  const [sortOrder, setSortOrder] = useState("desc");

  // Gửi request lấy historical db logs khi agentId thay đổi, socket kết nối, hoặc đổi chế độ live / khoảng thời gian
  useEffect(() => {
    if (agentId && isConnected) {
      setDbLogs([]); // Clear old state
      fetchDbLogsViaSocket('FETCH_SYSLOGS', agentId, isLive ? undefined : timeRange);
    }
  }, [agentId, isConnected, isLive, timeRange, fetchDbLogsViaSocket, setDbLogs]);

  // Hợp nhất socketLogs (realtime) với dbLogs (historical) và lọc trùng, chuẩn hóa trường tránh lỗi undefined
  const combinedLogs = useMemo(() => {
    const liveSys = socketLogs.filter(log => log.type === 'log_monitoring' || log._service || log.service).map(log => ({
      ...log,
      service: log.service || log._service || '',
      action: log.action || log._action || '',
      file_path: log.file_path || log.file || '',
      user: log.user || log._user || '',
      src_ip: log.src_ip || log.saddr || '',
      timestamp: log.timestamp || log._timestamp || new Date().toISOString()
    }));

    const dbSys = dbLogs.map(log => ({
      ...log,
      service: log.service || log._service || '',
      action: log.action || log._action || '',
      file_path: log.file_path || log.file || '',
      user: log.user || log._user || '',
      src_ip: log.src_ip || log.saddr || '',
      timestamp: log.timestamp || log._timestamp || new Date().toISOString()
    }));

    const merged = [...liveSys];
    const socketIds = new Set(liveSys.map(l => l.id));
    dbSys.forEach(log => {
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
      const dbSys = dbLogs.map(log => ({
        ...log,
        service: log.service || log._service || '',
        action: log.action || log._action || '',
        file_path: log.file_path || log.file || '',
        user: log.user || log._user || '',
        src_ip: log.src_ip || log.saddr || '',
        timestamp: log.timestamp || log._timestamp || new Date().toISOString()
      }));
      setDisplayedLogs(dbSys);
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
    const agent = agents.find(a => a.agent_id === id);
    return agent ? agent.hostname : id;
  };

  const filteredAndSortedLogs = useMemo(() => {
    return displayedLogs.filter((log) => {
      if (log.agent_id !== agentId) return false;

      if (searchQuery &&
        !log.service.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.action.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.file_path.toLowerCase().includes(searchQuery.toLowerCase())
      ) return false;

      return true;
    }).sort((a, b) => {
      if (sortOrder === "asc") return a.service.localeCompare(b.service);
      return b.service.localeCompare(a.service);
    });
  }, [displayedLogs, agentId, searchQuery, sortOrder]);

  const filteredAlerts = useMemo(() => {
    return displayedAlerts.filter((alert) => {
      if (alert.agent_id !== agentId) return false;
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [displayedAlerts, agentId]);

  const logProportions = useMemo(() => {
    const counts = {};
    filteredAndSortedLogs.forEach((log) => {
      counts[log.action] = (counts[log.action] || 0) + 1;
    });

    const total = filteredAndSortedLogs.length;
    if (total === 0) return [];

    const actionColorMap = {
      read: '#eab308',
      modify: '#ef4444',
      delete: '#22c55e',
      write: '#a855f7',
      execute: '#3b82f6',
    };

    let accumulatedPercent = 0;

    return Object.entries(counts).map(([action, count]) => {
      const percentage = (count / total) * 100;
      const radius = 35;
      const circumference = 2 * Math.PI * radius;
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = `${-(accumulatedPercent / 100) * circumference}`;

      accumulatedPercent += percentage;
      return {
        action,
        count,
        percentage: percentage.toFixed(1),
        color: actionColorMap[action] || actionColorMap.execute,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [filteredAndSortedLogs]);

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
    <div className="w-full flex h-screen overflow-hidden bg-[#0A0A0A] text-[#E0E0E0] font-sans">
      <SideBar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AppHeader route={'security/logs'} />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[160px]" />
          <div className="scanline opacity-10" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-7xl mx-auto space-y-5"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-none mb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full">
                  <Files />
                </div>
                <div>
                  <h3 className="text-md font-bold font-mono uppercase tracking-widest text-gray-400">Logs {isConnected ? <span className="text-green-500 text-xs ml-2">● CONNECTED</span> : <span className="text-red-500 text-xs ml-2">● DISCONNECTED</span>}</h3>
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

              <div className="bg-[#111] p-6 border border-[#232323] space-y-4">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-1">
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
                        placeholder="Path, service, action..."
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
                  <div className={`overflow-x-auto overflow-y-auto max-h-[440px] ${customScrollbarClasses}`}>
                    <table className="w-full text-left border-collapse font-mono text-md whitespace-nowrap">
                      <thead>
                        <tr className="sticky top-0 bg-[#141414] border-b border-[#232323] text-blue-500 font-bold uppercase tracking-wider z-10 shadow-[0_1px_0_0_#232323]">
                          <th className="py-3 px-4">File Path</th>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4 cursor-pointer hover:bg-[#1c1c1c] transition-colors" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                            <div className="flex items-center gap-2">
                              Service
                              <span className="text-gray-500">{sortOrder === "asc" ? <ArrowDown01 size={18} /> : <ArrowUp01 size={18} />}</span>
                            </div>
                          </th>
                          <th className="py-3 px-4">PID</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Src IP</th>
                          <th className="py-3 px-4">User</th>
                          <th className="py-3 px-4">Port</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-1 divide-transparent [&>tr:hover]:bg-blue-950/30 transition-colors">
                        {filteredAndSortedLogs.length > 0 ? (
                          filteredAndSortedLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-[#121212] transition-colors group">
                              <td className="py-3 px-4 text-gray-300 max-w-xs truncate" title={log.file_path}>
                                {log.file_path}
                              </td>
                              <td className="py-3 px-4 text-white">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString("vi-VN") : "-"}
                              </td>
                              <td className="py-3 px-4 text-white font-semibold group-hover:text-blue-400 transition-colors">
                                {log.service}
                              </td>
                              <td className="py-3 px-4 text-white">{log.pid}</td>
                              <td className="py-3 px-4">
                                <span className={`
                                        ${log.action === "read" ? "bg-yellow/40 border border-yellow-900/60 text-yellow-300" :
                                    log.action === "modify" ? "bg-red/40 border border-red-900/60 text-red-300" :
                                      log.action === "delete" ? "bg-green/40 border border-green-900/60 text-green-300" :
                                        log.action === "write" ? "bg-purple/40 border border-purple-900/60 text-purple-300" :
                                          "bg-blue/40 border border-blue-900/60 text-blue-300"
                                  } px-2 py-0.5 text-sm font-bold uppercase tracking-wide`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-white">{log.src_ip}</td>
                              <td className={`py-3 px-4 ${log.user === "root" ? "text-red-500" : "text-white"}`}>{log.user}</td>
                              <td className="py-3 px-4 text-white">{log.port}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8" className="py-16 h-30 text-center text-red-400 uppercase font-bold tracking-widest text-md">
                              <div className="flex items-center justify-center gap-2">
                                <CircleAlert size={16} />
                                Oops nothing here
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

            <div className="grid grid-cols-1 lg:grid-cols-[66.666%_33.333%] gap-1">
              <div className="bg-[#0D0D0D]/80 backdrop-blur-xl border border-[#2A2A2A] rounded-none p-1 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500/40 group-hover:border-red-500 transition-colors duration-500" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500/40 group-hover:border-red-500 transition-colors duration-500" />

                <div className="bg-[#111] p-4 border border-[#232323] space-y-4">
                  <div className="flex items-center gap-2 pb-2">
                    <Hackaday />
                    <span className="text-md font-bold font-mono text-red-400 uppercase tracking-wider">Alerts</span>
                  </div>

                  <div className="border border-[#232323] bg-[#0A0A0A]/40 overflow-hidden">
                    <div className={`overflow-x-auto max-h-[280px] overflow-y-auto ${customScrollbarClasses}`}>
                      <table className="w-full text-left border-collapse font-mono text-sm">
                        <thead>
                          <tr className="bg-[#141414] border-b border-[#232323] text-red-500 font-bold uppercase tracking-wider sticky top-0 z-10 shadow-[0_1px_0_0_#232323]">
                            <th className="py-2 px-3 w-100">Details</th>
                            <th className="py-2 px-3 w-5">Level</th>
                            <th className="py-2 px-3 w-40">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-1 divide-[#1C1C1C]">
                          {filteredAlerts.length > 0 ? (
                            filteredAlerts.map((alert) => (
                              <tr key={alert.id} className="hover:bg-red-950/20 transition-colors group">
                                <td className="py-2.5 px-3 text-white font-semibold group-hover:text-red-400">
                                  {alert.rule_name}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`text-sm font-bold px-1.5 py-0.5 ${alert.severity === "CRITICAL" ? "bg-red-900 text-white" :
                                    alert.severity === "HIGH" ? "bg-yellow-950 text-yellow-300 border border-yellow-900/40" :
                                      "bg-amber-950 text-amber-400 border border-amber-900/40"
                                    }`}>
                                    {alert.severity}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-white text-sm group-hover:text-red-400">
                                  {alert.timestamp ? new Date(alert.timestamp).toLocaleString("vi-VN") : "-"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="3" className="py-12 text-center text-gray-600 uppercase font-bold tracking-widest text-md">
                                Oops, may be something went wrong
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

                <div className="bg-[#111] p-4 border border-[#232323] space-y-4 h-full flex flex-col">
                  <div className="flex items-center gap-2 pb-2">
                    <Graph />
                    <span className="text-md font-bold font-mono text-blue-400 uppercase tracking-wider">Graph</span>
                  </div>

                  <div className="border border-[#232323] bg-[#0A0A0A]/40 p-4 flex flex-col items-center justify-center flex-1 space-y-4 min-h-[250px]">
                    {logProportions.length > 0 ? (
                      <>
                        <div className="relative w-32 h-32">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                            <circle
                              cx="40"
                              cy="40"
                              r="35"
                              className="stroke-[#141414]"
                              strokeWidth="8"
                              fill="transparent"
                            />
                            {logProportions.map((segment, idx) => (
                              <circle
                                key={idx}
                                cx="40"
                                cy="40"
                                r="35"
                                fill="transparent"
                                stroke={segment.color}
                                strokeWidth="8"
                                strokeDasharray={segment.strokeDasharray}
                                strokeDashoffset={segment.strokeDashoffset}
                                strokeLinecap="square"
                                className="transition-all duration-500"
                              />
                            ))}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                            <span className="text-sm text-gray-500 uppercase tracking-widest">Total</span>
                            <span className="text-md font-bold text-white">{filteredAndSortedLogs.length}</span>
                          </div>
                        </div>

                        <div className="w-full space-y-1.5 font-mono text-md">
                          {logProportions.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 inline-block" style={{ backgroundColor: item.color }} />
                                <span className="text-gray-400 uppercase text-sm">{item.action}</span>
                              </div>
                              <div className="text-white font-bold">
                                {item.count} <span className="text-gray-500 text-sm">({item.percentage}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-gray-600 uppercase font-bold tracking-widest text-md py-12">
                        Nothing here, it's MT
                      </div>
                    )}
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