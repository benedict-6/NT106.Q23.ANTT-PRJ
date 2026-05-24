'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, Activity, ShieldCheck, ArrowUpDown } from 'lucide-react';

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

export default function FimDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // States cho các bộ lọc
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('1d'); 
  const [isLive, setIsLive] = useState(false);

  // Thêm state cho việc sắp xếp
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  // States chứa dữ liệu
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
         console.error("Lỗi kéo agents: ", error);
       }
    };
    fetchAgents();

    setFimLogs([
        { id: 1, file_path: '/etc/shadow', event_type: 'MODIFIED', timestamp: new Date().toISOString(), size: 2048, uid: 0, gid: 0, permission: '0644', agent_id: 'agent1' },
        { id: 2, file_path: '/var/www/html/index.php', event_type: 'DELETED', timestamp: new Date(Date.now() - 3600000).toISOString(), size: 1024, uid: 33, gid: 33, permission: null, agent_id: 'agent1' },
        { id: 3, file_path: '/usr/bin/nc', event_type: 'ADDED', timestamp: new Date(Date.now() - 7200000).toISOString(), size: 55200, uid: 0, gid: 0, permission: '0755', agent_id: 'agent2' },
        { id: 4, file_path: '/tmp/malware.sh', event_type: 'ADDED', timestamp: new Date(Date.now() - 86400000).toISOString(), size: 4096, uid: 1000, gid: 1000, permission: '0777', agent_id: 'agent3' },
    ]);
  }, [router]);

  // Xử lý Lọc và Sắp xếp
  const filteredAndSortedLogs = useMemo(() => {
      let result = [...fimLogs];

      // 1. Lọc theo Agent
      if (selectedAgent !== 'all') {
          result = result.filter(log => log.agent_id === selectedAgent);
      }

      // 2. Lọc theo Search (file_path)
      if (searchQuery) {
          result = result.filter(log => log.file_path.toLowerCase().includes(searchQuery.toLowerCase()));
      }

      // 3. Lọc theo Thời gian (< 90 ngày hoặc theo mốc)
      const now = Date.now();
      const ranges = {
        '1m': 60 * 1000,
        '60m': 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - ranges[timeRange];
      result = result.filter(log => new Date(log.timestamp).getTime() >= cutoff);

      // 4. Sắp xếp
      if (sortField) {
          result.sort((a, b) => {
              let aValue = a[sortField];
              let bValue = b[sortField];

              if (sortField === 'size' || sortField === 'timestamp') {
                 if (sortField === 'timestamp') {
                     aValue = new Date(aValue).getTime();
                     bValue = new Date(bValue).getTime();
                 }
                 return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
              } else {
                 aValue = String(aValue).toLowerCase();
                 bValue = String(bValue).toLowerCase();
                 if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
                 if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
                 return 0;
              }
          });
      }

      return result;
  }, [fimLogs, selectedAgent, searchQuery, timeRange, sortField, sortOrder]);

  const handleSort = (field) => {
      if (sortField === field) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortOrder('desc'); // Default to descending when newly sorted (e.g. biggest size first)
      }
  };

  if (!mounted) return null;

  return (
    <div className="flex bg-[#050505] min-h-screen text-white font-sans selection:bg-blue-500/30">
      <SideBar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <AppHeader route={['File Integrity', 'FIM Monitor']} />
        
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="max-w-7xl mx-auto space-y-6">
            
            <div className="flex flex-col xl:flex-row xl:items-center justify-between bg-[#111111] p-4 rounded-xl border border-[#2A2A2A] shadow-md gap-4">
                
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-[#0a0a0a] px-3 py-2 rounded-lg border border-[#2A2A2A]">
                        <ShieldCheck size={16} className="text-blue-500" />
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
                            placeholder="Tìm kiếm file_path..." 
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

            <DashboardCard title="File Integrity Monitoring Logs" className="h-[calc(100vh-220px)]">
                <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 bg-[#111111] z-10 shadow-sm">
                            <tr className="border-b border-[#2A2A2A] text-gray-500 font-mono text-xs uppercase tracking-wider">
                                <th className="py-3 px-2 font-bold w-1/3 cursor-pointer hover:text-white group" onClick={() => handleSort('file_path')}>
                                    <div className="flex items-center">
                                        File Path <ArrowUpDown size={12} className={`ml-1 ${sortField==='file_path' ? 'text-blue-500' : 'opacity-0 group-hover:opacity-100'}`} />
                                    </div>
                                </th>
                                <th className="py-3 px-2 font-bold">Event Type</th>
                                <th className="py-3 px-2 font-bold cursor-pointer hover:text-white group" onClick={() => handleSort('timestamp')}>
                                    <div className="flex items-center">
                                        Last Modified <ArrowUpDown size={12} className={`ml-1 ${sortField==='timestamp' ? 'text-blue-500' : 'opacity-0 group-hover:opacity-100'}`} />
                                    </div>
                                </th>
                                <th className="py-3 px-2 font-bold text-center cursor-pointer hover:text-white group" onClick={() => handleSort('size')}>
                                    <div className="flex items-center justify-center">
                                        Size (Bytes) <ArrowUpDown size={12} className={`ml-1 ${sortField==='size' ? 'text-blue-500' : 'opacity-0 group-hover:opacity-100'}`} />
                                    </div>
                                </th>
                                <th className="py-3 px-2 font-bold text-center">UID / GID</th>
                                <th className="py-3 px-2 font-bold text-center">Permission</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]">
                            {filteredAndSortedLogs.length > 0 ? filteredAndSortedLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-[#1A1A1A] transition-colors group">
                                    <td className="py-3 px-2">
                                        <div className="font-mono text-[13px] text-gray-300 bg-[#0a0a0a] px-2 py-1 rounded inline-block border border-[#2A2A2A] group-hover:border-blue-500/30 transition-colors">
                                            {log.file_path}
                                        </div>
                                    </td>
                                    <td className="py-3 px-2">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
                                            log.event_type === 'MODIFIED' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                            log.event_type === 'DELETED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                            'bg-green-500/20 text-green-400 border border-green-500/30'
                                        }`}>
                                            {log.event_type}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-gray-400 text-xs">
                                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                                    </td>
                                    <td className="py-3 px-2 text-center text-gray-400 font-mono text-xs">
                                        {log.size?.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-2 text-center text-gray-400 font-mono text-xs">
                                        {log.uid} / {log.gid}
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                        {log.permission ? (
                                            <span className="text-[#e11d48] bg-red-500/10 px-2 py-0.5 rounded font-mono text-xs border border-red-500/20">
                                                {log.permission}
                                            </span>
                                        ) : (
                                            <span className="text-gray-600 italic text-xs">-</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-gray-500 font-mono text-sm">
                                        Không tìm thấy dữ liệu giám sát tệp tin nào.
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
