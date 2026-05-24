'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, Activity, Network, AlertOctagon, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';

export const DashboardCard = ({ title, children, className = '' }) => (
  <div className={`bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 flex flex-col shadow-lg ${className}`}>
    <div className="flex items-center justify-between mb-3 border-b border-[#2A2A2A]/50 pb-2">
      <h3 className="text-[14px] font-bold text-gray-200 tracking-wide">{title}</h3>
    </div>
    {children}
  </div>
);

const generateMockNetproLogs = () => {
    const now = Date.now();
    const logs = [];
    const protocols = ['TCP', 'UDP', 'ICMP'];
    const eventTypes = ['CONNECT', 'DISCONNECT', 'LISTEN', 'DROP'];
    const agents = ['agent1', 'agent2', 'agent3'];
    
    for(let i = 0; i < 20; i++) {
        logs.push({
            id: i,
            agent_id: agents[Math.floor(Math.random() * agents.length)],
            timestamp: new Date(now - Math.random() * 86400000).toISOString(),
            name: `net_process_${i}`,
            event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
            src_ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
            dest_ip: Math.random() > 0.5 ? `10.0.0.${Math.floor(Math.random() * 255)}` : `185.220.101.${Math.floor(Math.random() * 255)}`,
            pid: Math.floor(Math.random() * 5000) + 1000,
            uid: 0,
            protocol: protocols[Math.floor(Math.random() * protocols.length)],
            sport: Math.floor(Math.random() * 65000),
            dport: [80, 443, 22, 3306, 8080][Math.floor(Math.random() * 5)]
        });
    }
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const generateMockNetproAlerts = () => {
    const now = Date.now();
    return [
        { id: 101, timestamp: new Date(now - 30000).toISOString(), rule_name: "Suspicious Outbound Connection", src_ip: "192.168.1.45", dest_ip: "185.220.101.45", dport: 443, level: 12 },
        { id: 102, timestamp: new Date(now - 1500000).toISOString(), rule_name: "Port Scan Detected", src_ip: "10.0.0.22", dest_ip: "192.168.1.10", dport: 22, level: 8 },
        { id: 103, timestamp: new Date(now - 3500000).toISOString(), rule_name: "Unusual Protocol Traffic", src_ip: "192.168.1.100", dest_ip: "8.8.8.8", dport: 53, level: 5 },
        { id: 104, timestamp: new Date(now - 40000000).toISOString(), rule_name: "Suspicious Outbound Connection", src_ip: "192.168.1.50", dest_ip: "45.33.32.156", dport: 8080, level: 10 },
    ];
};

export default function NetproMonitor() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('1d'); 
  const [isLive, setIsLive] = useState(false);

  const [agents, setAgents] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);

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
       } catch (error) { console.error("Lỗi kéo data: ", error); }
       
       setRawLogs(generateMockNetproLogs());
       setAlerts(generateMockNetproAlerts());
    };
    fetchData();
  }, [router]);

  const { filteredLogs, statsData } = useMemo(() => {
      let filtered = rawLogs;

      if (selectedAgent !== 'all') {
          filtered = filtered.filter(log => log.agent_id === selectedAgent);
      }

      if (searchQuery) {
          filtered = filtered.filter(log => 
              log.src_ip.includes(searchQuery) || log.dest_ip.includes(searchQuery) || log.name.includes(searchQuery)
          );
      }

      const now = Date.now();
      const ranges = {
        '1m': 60 * 1000,
        '60m': 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - ranges[timeRange];
      filtered = filtered.filter(log => new Date(log.timestamp).getTime() >= cutoff);

      const stats = { '1m': 0, '30m': 0, '60m': 0, '1d': 0, '30d': 0 };
      
      alerts.forEach(a => {
          const diff = now - new Date(a.timestamp).getTime();
          if (diff <= 60 * 1000) stats['1m']++;
          if (diff <= 30 * 60 * 1000) stats['30m']++;
          if (diff <= 60 * 60 * 1000) stats['60m']++;
          if (diff <= 24 * 60 * 60 * 1000) stats['1d']++;
          if (diff <= 30 * 24 * 60 * 60 * 1000) stats['30d']++;
      });

      const statsDataArray = [
          { name: '1 Min', count: stats['1m'] },
          { name: '30 Mins', count: stats['30m'] },
          { name: '1 Hour', count: stats['60m'] },
          { name: '1 Day', count: stats['1d'] },
          { name: '30 Days', count: stats['30d'] },
      ];

      return { filteredLogs: filtered, statsData: statsDataArray };
  }, [rawLogs, alerts, searchQuery, selectedAgent, timeRange]);

  if (!mounted) return null;

  return (
    <div className="flex bg-[#050505] min-h-screen text-white font-sans selection:bg-blue-500/30">
      <SideBar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <AppHeader route={['Network', 'Netpro Monitor']} />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-hide">
          <div className="max-w-[1400px] mx-auto space-y-4 lg:space-y-6">
            
            <div className="flex flex-col xl:flex-row xl:items-center justify-between bg-[#111111] p-4 rounded-xl border border-[#2A2A2A] shadow-md gap-4">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-[#0a0a0a] px-3 py-2 rounded-lg border border-[#2A2A2A]">
                        <Network size={16} className="text-blue-500" />
                        <select 
                            className="bg-transparent text-sm text-gray-200 outline-none cursor-pointer font-bold w-40 truncate"
                            value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
                        >
                            <option value="all" className="bg-[#111]">Tất cả Agents</option>
                            {agents.map(a => <option key={a.agent_id} value={a.agent_id} className="bg-[#111]">{a.description || a.agent_id}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2 bg-[#0a0a0a] px-3 py-2 rounded-lg border border-[#2A2A2A] w-64 focus-within:border-blue-500 transition-colors">
                        <Search size={16} className="text-gray-500" />
                        <input 
                            type="text" placeholder="Tìm kiếm IP, Tên..." 
                            className="bg-transparent border-none outline-none text-sm w-full text-gray-200 placeholder-gray-600"
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center bg-[#0a0a0a] p-1 rounded-lg border border-[#2A2A2A]">
                        <Clock size={16} className="text-gray-500 ml-2 mr-1" />
                        {['1m', '60m', '1d', '30d', '90d'].map((range) => (
                            <button 
                                key={range} onClick={() => setTimeRange(range)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${ timeRange === range ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]' }`}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <div className="h-6 w-px bg-[#2A2A2A]"></div>
                    <button 
                        onClick={() => setIsLive(!isLive)}
                        className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg font-bold text-sm transition-all border ${
                            isLive ? 'bg-red-500/10 border-red-500/50 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-[#0a0a0a] border-[#2A2A2A] text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        <Activity size={16} className={isLive ? 'animate-pulse' : ''} />
                        <span>{isLive ? 'LIVE ON' : 'LIVE OFF'}</span>
                    </button>
                </div>
            </div>

            <DashboardCard title="Raw Network Logs (Traffic)" className="h-80">
                <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 bg-[#111111] z-10 shadow-sm">
                            <tr className="border-b border-[#2A2A2A] text-gray-500 font-mono text-[10px] uppercase tracking-wider">
                                <th className="py-2 px-2 font-bold">Timestamp</th>
                                <th className="py-2 px-2 font-bold">Name</th>
                                <th className="py-2 px-2 font-bold">Event Type</th>
                                <th className="py-2 px-2 font-bold">Source IP : Port</th>
                                <th className="py-2 px-2 font-bold">Dest IP : Port</th>
                                <th className="py-2 px-2 font-bold text-center">Protocol</th>
                                <th className="py-2 px-2 font-bold text-center">PID/UID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-[#1A1A1A] transition-colors group">
                                    <td className="py-2 px-2 text-gray-400 text-xs">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                                    <td className="py-2 px-2 font-mono text-[11px] text-gray-300">{log.name}</td>
                                    <td className="py-2 px-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            log.event_type === 'CONNECT' ? 'bg-green-500/20 text-green-400' :
                                            log.event_type === 'DROP' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                        }`}>{log.event_type}</span>
                                    </td>
                                    <td className="py-2 px-2 font-mono text-xs text-blue-400">{log.src_ip} <span className="text-gray-600">:{log.sport}</span></td>
                                    <td className="py-2 px-2 font-mono text-xs text-orange-400">{log.dest_ip} <span className="text-gray-600">:{log.dport}</span></td>
                                    <td className="py-2 px-2 text-center font-bold text-[11px] text-gray-300">{log.protocol}</td>
                                    <td className="py-2 px-2 text-center text-gray-500 text-[11px] font-mono">{log.pid} / {log.uid}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </DashboardCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                
                <DashboardCard title="Network Alerts (Threats Detected)" className="h-72">
                    <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 bg-[#111111] z-10">
                                <tr className="border-b border-[#2A2A2A] text-gray-500 font-mono text-[10px] uppercase tracking-wider">
                                    <th className="py-2 px-2 font-bold w-1/2">Alert Rule</th>
                                    <th className="py-2 px-2 font-bold">Target IP:Port</th>
                                    <th className="py-2 px-2 font-bold text-center">Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1A1A1A]">
                                {alerts.map((alert) => (
                                    <tr key={alert.id} className="hover:bg-[#1A1A1A] transition-colors group">
                                        <td className="py-2 px-2">
                                            <div className="flex items-start space-x-2">
                                                <AlertOctagon size={14} className={`mt-0.5 shrink-0 ${alert.level >= 10 ? 'text-red-500' : 'text-orange-500'}`} />
                                                <span className="text-xs text-gray-200">{alert.rule_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-2 font-mono text-xs text-gray-400">
                                            {alert.dest_ip}:{alert.dport}
                                        </td>
                                        <td className="py-2 px-2 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                alert.level >= 10 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                            }`}>LVL {alert.level}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </DashboardCard>

                <DashboardCard title="Alerts Count Distribution" className="h-72">
                    <div className="flex-1 w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" tick={{fill: '#888', fontSize: 11, fontWeight: 'bold'}} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" tick={{fill: '#666', fontSize: 11}} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip 
                                    cursor={{fill: '#1A1A1A'}} 
                                    contentStyle={{ backgroundColor: '#111', borderColor: '#2A2A2A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                    formatter={(value) => [value, 'Total Alerts']}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                                    {statsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#3b82f6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </DashboardCard>
                
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
