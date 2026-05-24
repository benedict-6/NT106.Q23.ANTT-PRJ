'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, Activity, Terminal, ShieldAlert } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

const generateMockLogs = () => {
    const actions = ['modified', 'deleted', 'created', 'accessed'];
    const services = ['sshd', 'nginx', 'mysql', 'cron'];
    const agents = ['agent1', 'agent2', 'agent3'];
    const logs = [];
    const now = Date.now();
    for(let i=0; i<30; i++) {
        logs.push({
            id: i,
            agent_id: agents[Math.floor(Math.random() * agents.length)],
            file_path: `/var/log/${services[Math.floor(Math.random() * services.length)]}.log`,
            timestamp: new Date(now - Math.random() * 86400000).toISOString(),
            service: services[Math.floor(Math.random() * services.length)],
            pid: Math.floor(Math.random() * 5000),
            action: actions[Math.floor(Math.random() * actions.length)],
            src_ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
            user: ['root', 'ubuntu', 'mysql'][Math.floor(Math.random() * 3)],
            port: [22, 80, 3306, 0][Math.floor(Math.random() * 4)]
        });
    }
    return logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const generateMockAlerts = () => {
    const now = Date.now();
    return [
        { id: 1, timestamp: new Date(now - 120000).toISOString(), description: "Multiple login failures", level: 9 },
        { id: 2, timestamp: new Date(now - 360000).toISOString(), description: "Unauthorized access attempt", level: 12 },
        { id: 3, timestamp: new Date(now - 860000).toISOString(), description: "Service stopped unexpectedly", level: 5 },
    ];
}

export default function LogsMonitor() {
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
       
       setRawLogs(generateMockLogs());
       setAlerts(generateMockAlerts());
    };
    fetchData();
  }, [router]);

  const { filteredLogs, pieData } = useMemo(() => {
      let filtered = rawLogs;

      if (selectedAgent !== 'all') {
          filtered = filtered.filter(log => log.agent_id === selectedAgent);
      }

      if (searchQuery) {
          filtered = filtered.filter(log => 
              log.file_path.includes(searchQuery) || log.service.includes(searchQuery) || log.user.includes(searchQuery)
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

      const actionCounts = {};
      filtered.forEach(log => {
          actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      });

      const pieDataArray = Object.keys(actionCounts).map(key => ({
          name: key.toUpperCase(),
          value: actionCounts[key]
      }));

      return { filteredLogs: filtered, pieData: pieDataArray };
  }, [rawLogs, searchQuery, selectedAgent, timeRange]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (!mounted) return null;

  return (
    <div className="flex bg-[#050505] min-h-screen text-white font-sans selection:bg-blue-500/30">
      <SideBar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <AppHeader route={['Logs', 'System Logs Monitor']} />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-hide">
          <div className="max-w-[1400px] mx-auto space-y-4 lg:space-y-6">
            
            <div className="flex flex-col xl:flex-row xl:items-center justify-between bg-[#111111] p-4 rounded-xl border border-[#2A2A2A] shadow-md gap-4">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-[#0a0a0a] px-3 py-2 rounded-lg border border-[#2A2A2A]">
                        <Terminal size={16} className="text-blue-500" />
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
                            type="text" placeholder="Tìm kiếm file, service, user..." 
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

            <DashboardCard title="Collected Logs" className="h-80">
                <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 bg-[#111111] z-10 shadow-sm">
                            <tr className="border-b border-[#2A2A2A] text-gray-500 font-mono text-[10px] uppercase tracking-wider">
                                <th className="py-2 px-2 font-bold">Timestamp</th>
                                <th className="py-2 px-2 font-bold">File Path</th>
                                <th className="py-2 px-2 font-bold">Service</th>
                                <th className="py-2 px-2 font-bold">PID</th>
                                <th className="py-2 px-2 font-bold">Action</th>
                                <th className="py-2 px-2 font-bold">Src IP</th>
                                <th className="py-2 px-2 font-bold">User</th>
                                <th className="py-2 px-2 font-bold">Port</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-[#1A1A1A] transition-colors group">
                                    <td className="py-2 px-2 text-gray-400 text-xs">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                                    <td className="py-2 px-2 font-mono text-[11px] text-gray-300 truncate max-w-[150px]">{log.file_path}</td>
                                    <td className="py-2 px-2 font-bold text-[#60a5fa]">{log.service}</td>
                                    <td className="py-2 px-2 text-gray-400 font-mono text-xs">{log.pid}</td>
                                    <td className="py-2 px-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                            log.action === 'deleted' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            log.action === 'modified' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                            log.action === 'created' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>{log.action}</span>
                                    </td>
                                    <td className="py-2 px-2 font-mono text-xs text-purple-400">{log.src_ip}</td>
                                    <td className="py-2 px-2 text-[#f43f5e] text-xs font-bold uppercase">{log.user}</td>
                                    <td className="py-2 px-2 font-mono text-xs text-gray-500">{log.port !== 0 ? log.port : '-'}</td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr><td colSpan="8" className="py-8 text-center text-gray-500 text-sm">Không có dữ liệu logs.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </DashboardCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                
                <DashboardCard title="Log Alerts" className="h-72">
                    <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 bg-[#111111] z-10">
                                <tr className="border-b border-[#2A2A2A] text-gray-500 font-mono text-[10px] uppercase tracking-wider">
                                    <th className="py-2 px-2 font-bold w-1/4">Time</th>
                                    <th className="py-2 px-2 font-bold">Alert Description</th>
                                    <th className="py-2 px-2 font-bold text-center">Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1A1A1A]">
                                {alerts.map((alert) => (
                                    <tr key={alert.id} className="hover:bg-[#1A1A1A] transition-colors group">
                                        <td className="py-2 px-2 text-gray-400 text-[11px]">{new Date(alert.timestamp).toLocaleTimeString()}</td>
                                        <td className="py-2 px-2">
                                            <div className="flex items-start space-x-2">
                                                <ShieldAlert size={14} className={`mt-0.5 shrink-0 ${alert.level >= 10 ? 'text-red-500' : 'text-orange-500'}`} />
                                                <span className="text-xs text-gray-200">{alert.description}</span>
                                            </div>
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

                <DashboardCard title="Logs Action Ratio" className="h-72">
                    <div className="flex-1 w-full pt-4">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#111', borderColor: '#2A2A2A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                                Không có dữ liệu để vẽ biểu đồ
                            </div>
                        )}
                    </div>
                </DashboardCard>
                
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
