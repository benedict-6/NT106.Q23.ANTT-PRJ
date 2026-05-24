"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';

import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';

import { CircleAlert, ArrowDown01, ArrowUp01, ChevronLeft, ChevronRight, Network, ShieldAlert, Activity } from 'lucide-react';
import { AlwaysData, Hackaday, WireShark } from '../../helper/icons.jsx';

// Change MOCK_NETPRO_DATABASE for real data
const MOCK_NETPRO_DATABASE = [
  { id: 1, agent_id: "AGENT-001", comm: "nginx", event_type: "socket_connect", saddr: "192.168.1.50", daddr: "10.0.0.12", pid: 2045, uid: 33, protocol: "TCP", sport: 48292, dport: 443, timestamp: "2026-05-23T15:30:00Z" },
  { id: 2, agent_id: "AGENT-001", comm: "ssh-worker", event_type: "accept", saddr: "203.0.113.5", daddr: "192.168.1.50", pid: 8841, uid: 0, protocol: "TCP", sport: 51220, dport: 22, timestamp: "2026-05-22T09:15:00Z" },
  { id: 3, agent_id: "AGENT-002", comm: "redis-server", event_type: "socket_bind", saddr: "127.0.0.1", daddr: "127.0.0.1", pid: 1024, uid: 999, protocol: "TCP", sport: 6379, dport: 0, timestamp: "2026-05-20T11:45:00Z" },
  { id: 4, agent_id: "AGENT-002", comm: "curl", event_type: "dns_lookup", saddr: "192.168.2.11", daddr: "8.8.8.8", pid: 15420, uid: 1000, protocol: "UDP", sport: 39144, dport: 53, timestamp: "2026-04-12T08:20:00Z" },
  { id: 5, agent_id: "AGENT-003", comm: "python3", event_type: "reverse_shell", saddr: "192.168.3.4", daddr: "45.33.22.11", pid: 31122, uid: 0, protocol: "TCP", sport: 44444, dport: 4444, timestamp: "2026-05-23T16:20:00Z" },
  { id: 6, agent_id: "AGENT-001", comm: "node-auth", event_type: "socket_connect", saddr: "192.168.1.50", daddr: "172.217.16.142", pid: 4521, uid: 1001, protocol: "TCP", sport: 59321, dport: 80, timestamp: "2026-05-23T16:45:00Z" },
  { id: 7, agent_id: "AGENT-001", comm: "node-auth", event_type: "socket_connect", saddr: "192.168.1.50", daddr: "172.217.16.142", pid: 4521, uid: 1001, protocol: "TCP", sport: 59321, dport: 80, timestamp: "2026-05-23T16:45:00Z" },
  { id: 8, agent_id: "AGENT-001", comm: "node-auth", event_type: "socket_connect", saddr: "192.168.1.50", daddr: "172.217.16.142", pid: 4521, uid: 1001, protocol: "TCP", sport: 59321, dport: 80, timestamp: "2026-05-23T16:45:00Z" },
  { id: 9, agent_id: "AGENT-001", comm: "node-auth", event_type: "socket_connect", saddr: "192.168.1.50", daddr: "172.217.16.142", pid: 4521, uid: 1001, protocol: "TCP", sport: 59321, dport: 80, timestamp: "2026-05-23T16:45:00Z" },
  { id: 10, agent_id: "AGENT-001", comm: "node-auth", event_type: "socket_connect", saddr: "192.168.1.50", daddr: "172.217.16.142", pid: 4521, uid: 1001, protocol: "TCP", sport: 59321, dport: 80, timestamp: "2026-05-23T16:45:00Z" },
  { id: 11, agent_id: "AGENT-001", comm: "node-auth", event_type: "socket_connect", saddr: "192.168.1.50", daddr: "172.217.16.142", pid: 4521, uid: 1001, protocol: "TCP", sport: 59321, dport: 80, timestamp: "2026-05-23T16:45:00Z" },
  { id: 12, agent_id: "AGENT-001", comm: "node-auth", event_type: "socket_connect", saddr: "192.168.1.50", daddr: "172.217.16.142", pid: 4521, uid: 1001, protocol: "TCP", sport: 59321, dport: 80, timestamp: "2026-05-23T16:45:00Z" },
  { id: 13, agent_id: "AGENT-001", comm: "node-auth", event_type: "socket_connect", saddr: "192.168.1.50", daddr: "172.217.16.142", pid: 4521, uid: 1001, protocol: "TCP", sport: 59321, dport: 80, timestamp: "2026-05-23T16:45:00Z" },
  { id: 14, agent_id: "AGENT-001", comm: "node-auth", event_type: "socket_connect", saddr: "192.168.1.50", daddr: "172.217.16.142", pid: 4521, uid: 1001, protocol: "TCP", sport: 59321, dport: 80, timestamp: "2026-05-23T16:45:00Z" },
];

const MOCK_NETPRO_ALERTS = [
  { id: 1, agent_id: "AGENT-001", rule_name: "Unusual Inbound SSH Connection", severity: "HIGH", timestamp: "2026-05-23T16:45:00Z" },
  { id: 2, agent_id: "AGENT-003", rule_name: "Potential Reverse Shell Detected", severity: "CRITICAL", timestamp: "2026-05-23T16:20:00Z" },
  { id: 3, agent_id: "AGENT-002", rule_name: "Outbound DNS Tunneling Suspect", severity: "MEDIUM", timestamp: "2026-04-12T08:20:00Z" },
  { id: 4, agent_id: "AGENT-002", rule_name: "DDOS detected", severity: "HIGH", timestamp: "2026-04-12T08:20:00Z" },
  { id: 5, agent_id: "AGENT-002", rule_name: "DDOS detected", severity: "HIGH", timestamp: "2026-04-12T08:20:00Z" },
  { id: 6, agent_id: "AGENT-002", rule_name: "DDOS detected", severity: "HIGH", timestamp: "2026-04-12T08:20:00Z" },
  { id: 7, agent_id: "AGENT-002", rule_name: "DDOS detected", severity: "HIGH", timestamp: "2026-04-12T08:20:00Z" },
  { id: 8, agent_id: "AGENT-002", rule_name: "DDOS detected", severity: "HIGH", timestamp: "2026-04-12T08:20:00Z" },
  { id: 9, agent_id: "AGENT-002", rule_name: "DDOS detected", severity: "HIGH", timestamp: "2026-04-12T08:20:00Z" },
  { id: 10, agent_id: "AGENT-002", rule_name: "DDOS detected", severity: "HIGH", timestamp: "2026-04-12T08:20:00Z" },
  { id: 11, agent_id: "AGENT-002", rule_name: "DDOS detected", severity: "HIGH", timestamp: "2026-04-12T08:20:00Z" },
  { id: 12, agent_id: "AGENT-002", rule_name: "DDOS detected", severity: "HIGH", timestamp: "2026-04-12T08:20:00Z" },
];

const NetproPage = () => {
  const uniqueAgentList = useMemo(() => {
    return [...new Set(MOCK_NETPRO_DATABASE.map(log => log.agent_id))];
  }, []);

  const [agentId, setAgentId] = useState(uniqueAgentList[0] || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState("90");
  const [isLive, setIsLive] = useState(true);
  const [sortOrder, setSortOrder] = useState("desc");

  const handleCycleAgent = (direction) => {
    const currentIndex = uniqueAgentList.indexOf(agentId);
    if (currentIndex === -1) return;

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= uniqueAgentList.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = uniqueAgentList.length - 1;

    setAgentId(uniqueAgentList[nextIndex]);
  };

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      console.log(`[LIVE] Fetching netpro kernel streams for agent: ${agentId}...`);
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive, agentId]);

  const filteredAndSortedLogs = useMemo(() => {
    return MOCK_NETPRO_DATABASE.filter((log) => {
      if (log.agent_id !== agentId) return false;

      if (searchQuery && !log.comm.toLowerCase().includes(searchQuery.toLowerCase()) && !log.event_type.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      const pullDate = new Date(log.timestamp);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate - pullDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timeRange !== "ALL" && diffDays > parseInt(timeRange)) return false;

      return true;
    }).sort((a, b) => {
      if (sortOrder === "asc") return a.comm.localeCompare(b.comm);
      return b.comm.localeCompare(a.comm);
    });
  }, [agentId, searchQuery, timeRange, sortOrder]);

  const filteredAlerts = useMemo(() => {
    return MOCK_NETPRO_ALERTS.filter((alert) => {
      if (alert.agent_id !== agentId) return false;

      const alertDate = new Date(alert.timestamp);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate - alertDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timeRange !== "ALL" && diffDays > parseInt(timeRange)) return false;
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [agentId, timeRange]);

  const alertMetrics = useMemo(() => {
    const now = new Date();
    let stats = { min1: 0, min30: 0, min60: 0, day1: 0, day30: 0 };

    MOCK_NETPRO_ALERTS.forEach((alert) => {
      if (alert.agent_id !== agentId) return;

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
  }, [agentId]);

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
                  <h3 className="text-md font-bold font-mono uppercase tracking-widest text-gray-400">NETWORK & PROCCESS</h3>
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
                      {id}
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
                        <option value="90">&gt; Last 90D</option>
                        <option value="30">&gt; Last 30D</option>
                        <option value="ALL">ALL</option>
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
                              <td className="py-3 px-4 text-white">{log.saddr}</td>
                              <td className="py-3 px-4 text-white">{log.daddr}</td>
                              <td className="py-3 px-4 text-white">{log.pid}</td>
                              <td className="py-3 px-4 text-white">{log.uid}</td>
                              <td className="py-3 px-4">
                                <span className="bg-[#1B263B]/30 border border-blue-900/50 px-2 py-0.5 text-sm text-blue-400 font-bold">
                                  {log.protocol}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-white">{log.sport || "-"}</td>
                              <td className="py-3 px-4 text-white">{log.dport || "-"}</td>
                              <td className="py-3 px-4 text-white">
                                {new Date(log.timestamp).toLocaleString("vi-VN", { timeZone: "UTC" })}
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
                                  {new Date(alert.timestamp).toLocaleString("vi-VN", { timeZone: "UTC" })}
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