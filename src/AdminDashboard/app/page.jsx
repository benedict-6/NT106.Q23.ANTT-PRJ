'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Clock, ShieldAlert, Shield, Unplug, Pickaxe } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

import { SideBar } from '../components/sidebar.jsx';
import { AppHeader } from '../components/header.jsx';
import { useDashboardSocket } from '../hooks/useDashboardSocket.js';

const DashboardCard = ({ title, children, className = '', headerAction = null }) => (
    <div className={`bg-[#111111] border border-[#2A2A2A] rounded-xl p-5 flex flex-col shadow-lg ${className}`}>
        <div className="flex items-center justify-between mb-4 border-b border-[#2A2A2A]/50 pb-2">
            <h3 className="text-md font-bold text-gray-200 tracking-wide">{title}</h3>
            {headerAction}
        </div>
        {children}
    </div>
);

const generateMockAlerts = () => {
    const now = Date.now();
    const mocks = [];
    const ruleNames = ["Reverse Shell", "SSH Brute Force", "Malware", "Privilege Esc", "Login Success"];

    for (let i = 0; i < 30; i++) {
        const time = new Date(now - ((29 - i) * 24 * 60 * 1000));

        let level;
        if (i % 4 === 0) level = Math.floor(Math.random() * 4) + 12;
        else if (i % 2 === 0) level = Math.floor(Math.random() * 4) + 7;
        else level = Math.floor(Math.random() * 5) + 1;

        mocks.push({
            timestamp: time.toISOString(),
            rule_name: ruleNames[Math.floor(Math.random() * ruleNames.length)],
            description: "Cảnh báo bảo mật được giả lập...",
            packet_level: level
        });
    }
    return mocks;
};

export default function Dashboard() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    const { alerts: socketAlerts, agentStatuses } = useDashboardSocket();
    const [rawAlerts, setRawAlerts] = useState([]);
    const [agents, setAgents] = useState([]);
    const [timeRange, setTimeRange] = useState('1d');
    const [expandedAlertId, setExpandedAlertId] = useState(null);
    const [selectedAgentId, setSelectedAgentId] = useState('all');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }
        setMounted(true);

        const fetchData = async () => {
            const masterUrl = process.env.NEXT_PUBLIC_MASTER_URL || "http://localhost:3000";
            const headers = { 'Authorization': `Bearer ${token}` };
            try {
                const [alertRes, agentRes] = await Promise.all([
                    fetch(`${masterUrl}/api/dashboard/alerts`, { headers }).catch(() => ({ ok: false })),
                    fetch(`${masterUrl}/api/dashboard/agents`, { headers }).catch(() => ({ ok: false }))
                ]);

                if (alertRes.ok) {
                    const alertData = await alertRes.json();
                    if (alertData.alerts && alertData.alerts.length > 0) {
                        setRawAlerts(alertData.alerts);
                    } else {
                        setRawAlerts(generateMockAlerts());
                    }
                } else {
                    setRawAlerts(generateMockAlerts());
                }

                if (agentRes.ok) {
                    const agentData = await agentRes.json();
                    setAgents(agentData.agents || []);
                }
            } catch (error) {
                setRawAlerts(generateMockAlerts());
            }
        };
        fetchData();
    }, [router]);

    const { filteredAlerts, timelineData, alertTypeData, tableData, agentStats, agentMap } = useMemo(() => {
        const now = Date.now();
        const ranges = {
            '1m': 60 * 1000,
            '60m': 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000,
        };
        const cutoff = now - ranges[timeRange];

        // Merge rawAlerts from API with socketAlerts
        const mergedAlerts = [...socketAlerts, ...rawAlerts].filter((v, i, a) => a.findIndex(t => (t.id === v.id || (t.rule_alert_id && t.rule_alert_id === v.rule_alert_id))) === i);
        const validAlerts = mergedAlerts
            .filter(a => new Date(a.created_at || a.timestamp).getTime() >= cutoff)
            .sort((a, b) => new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime());

        const timelineMap = {};
        validAlerts.forEach(a => {
            const date = new Date(a.created_at || a.timestamp);
            const timeKey = (timeRange === '1m' || timeRange === '60m' || timeRange === '1d')
                ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

            let lvl = parseInt(a.packet_level || a.rule_level || 0);
            if (lvl > 15) lvl = 15;
            if (lvl < 1) lvl = 1;

            if (!timelineMap[timeKey]) {
                timelineMap[timeKey] = { time: timeKey, level: lvl };
            } else {
                if (lvl > timelineMap[timeKey].level) {
                    timelineMap[timeKey].level = lvl;
                }
            }
        });
        const timelineData = Object.values(timelineMap).sort((a, b) => a.time.localeCompare(b.time));

        const typeMap = {};
        validAlerts.forEach(a => {
            const name = a.rule_name || a.description || 'Unknown Rule';
            typeMap[name] = (typeMap[name] || 0) + 1;
        });
        const alertTypeData = Object.entries(typeMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const tableMap = {};
        validAlerts.forEach(a => {
            const name = a.rule_name || a.description || 'Unknown Rule';
            const lvl = parseInt(a.packet_level || a.rule_level || 0);
            const key = `${name}-${lvl}`;
            if (!tableMap[key]) tableMap[key] = { description: name, level: lvl, count: 0 };
            tableMap[key].count += 1;
        });
        const tableData = Object.values(tableMap)
            .filter(item => item.level >= 7)
            .sort((a, b) => b.level - a.level || b.count - a.count);

        // Merge agents with socket agentStatuses
        const mergedAgents = agents.map(a => {
            if (agentStatuses[a.agent_id]) {
                return { ...a, agent_status: agentStatuses[a.agent_id].status };
            }
            return a;
        });

        const active = mergedAgents.filter(a => a.agent_status === 'online').length;
        const offline = mergedAgents.filter(a => a.agent_status === 'offline').length;

        const agentMap = {};
        agents.forEach(a => {
            agentMap[a.agent_id] = a.hostname || a.agent_id;
        });

        return { filteredAlerts: validAlerts, timelineData, alertTypeData, tableData, agentStats: { active, offline }, agentMap };
    }, [rawAlerts, socketAlerts, agents, agentStatuses, timeRange]);

    const feedAlerts = useMemo(() => {
        if (selectedAgentId === 'all') return filteredAlerts;
        return filteredAlerts.filter(a => a.agent_id === selectedAgentId);
    }, [filteredAlerts, selectedAgentId]);

    if (!mounted) return null;
    const barColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

    return (
        <div className="flex bg-[#050505] min-h-screen text-white font-sans selection:bg-blue-500/30">
            <SideBar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <AppHeader route={"dashboard"} hasAlerts={socketAlerts.length > 0} />

                <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-[#111111] p-4 rounded-xl border border-[#2A2A2A] shadow-md gap-4">
                            <div className="flex items-center space-x-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                        <Pickaxe size={20} className="text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Active Agents</p>
                                        <p className="text-2xl font-bold text-green-400 text-center">{agentStats.active}</p>
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-[#2A2A2A]"></div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                        <Unplug size={20} className="text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Disconnected</p>
                                        <p className="text-2xl font-bold text-red-500 text-center">{agentStats.offline}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 bg-[#0a0a0a] p-1.5 rounded-lg border border-[#2A2A2A]">
                                <Clock size={16} className="text-gray-500 ml-2 mr-1" />
                                {['1m', '60m', '1d', '30d', '90d'].map((range) => (
                                    <button
                                        key={range} onClick={() => setTimeRange(range)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeRange === range ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-[#1A1A1A]'
                                            }`}
                                    >
                                        {range.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <DashboardCard
                            title="Recent Alert Details Feed"
                            className="h-[500px]"
                            headerAction={
                                <select
                                    value={selectedAgentId}
                                    onChange={(e) => setSelectedAgentId(e.target.value)}
                                    className="bg-[#0a0a0a] text-xs font-bold text-gray-300 border border-[#2A2A2A] rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    <option value="all">All Agents (All Hosts)</option>
                                    {agents.map(a => (
                                        <option key={a.agent_id} value={a.agent_id}>
                                            {a.hostname || a.agent_id}
                                        </option>
                                    ))}
                                </select>
                            }
                        >
                            <div className="flex-1 overflow-y-auto scrollbar-hide pr-2 mt-2">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="sticky top-0 bg-[#111111] z-10">
                                        <tr className="border-b border-[#2A2A2A] text-gray-500 font-mono text-xs uppercase tracking-wider">
                                            <th className="py-3 px-4 font-bold">Time</th>
                                            <th className="py-3 px-4 font-bold">Host Name</th>
                                            <th className="py-3 px-4 font-bold">Rule Name</th>
                                            <th className="py-3 px-4 font-bold text-center">Severity</th>
                                            <th className="py-3 px-4 font-bold text-right">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1A1A1A]">
                                        {feedAlerts.length > 0 ? feedAlerts.map((alert, idx) => {
                                            const uniqueKey = alert.id || alert.rule_alert_id || `idx-${idx}`;
                                            const isExpanded = expandedAlertId === uniqueKey;
                                            return (
                                                <React.Fragment key={uniqueKey}>
                                                    <tr
                                                        className="hover:bg-[#1A1A1A]/50 transition-colors cursor-pointer"
                                                        onClick={() => setExpandedAlertId(isExpanded ? null : uniqueKey)}
                                                    >
                                                        <td className="py-3 px-4 text-xs font-mono text-gray-400">
                                                            {new Date(alert.created_at || alert.timestamp).toLocaleString('vi-VN')}
                                                        </td>
                                                        <td className="py-3 px-4 text-xs font-bold text-blue-400">
                                                            {agentMap[alert.agent_id] || alert.agent_id}
                                                        </td>
                                                        <td className="py-3 px-4 text-xs font-bold text-gray-200">
                                                            {alert.rule_name || alert.description || alert.rule_id}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${(alert.packet_level || alert.rule_level) > 10 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                                (alert.packet_level || alert.rule_level) >= 7 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                                }`}>
                                                                LVL {alert.packet_level || alert.rule_level || 1}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <button className="text-xs text-blue-500 hover:text-blue-400 font-mono">
                                                                {isExpanded ? '[COLLAPSE]' : '[EXPAND]'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan="5" className="bg-[#0a0a0a] p-4 border border-[#2A2A2A] rounded-lg">
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-2">
                                                                        <span className="text-xs font-bold text-gray-400">Alert Details Payload</span>
                                                                        <span className="text-[10px] text-gray-600 font-mono">Rule ID: {alert.rule_id}</span>
                                                                    </div>
                                                                    {alert.payload && typeof alert.payload === 'object' ? (
                                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                                            {Object.entries(alert.payload).map(([k, v]) => (
                                                                                <div key={k} className="bg-[#111] p-2 rounded border border-[#2A2A2A]/40 text-xs">
                                                                                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{k}</div>
                                                                                    <div className="font-mono text-gray-300 break-all mt-0.5">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <pre className="bg-[#111] p-3 rounded border border-[#2A2A2A]/40 text-[11px] font-mono text-gray-300 overflow-x-auto max-h-[300px]">
                                                                            {JSON.stringify(alert, null, 2)}
                                                                        </pre>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan="5" className="py-12 text-center text-gray-500 font-mono text-sm">No detailed alerts found for this time range</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </DashboardCard>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            <DashboardCard title="Event Alert Type" className="h-[420px]">
                                <div className="flex flex-col h-full">
                                    <div className="grid grid-cols-2 gap-y-2 gap-x-2 mb-4 max-h-24 overflow-y-auto scrollbar-hide">
                                        {alertTypeData.map((item, idx) => (
                                            <div key={item.name} className="flex items-center space-x-2">
                                                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: barColors[idx % barColors.length] }} />
                                                <span className="truncate text-xs font-bold text-gray-300" title={item.name}>{item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex-1 w-full bg-[#0a0a0a] rounded-lg p-4 border border-[#2A2A2A]">
                                        {alertTypeData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={alertTypeData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" hide />
                                                    <Tooltip cursor={{ fill: '#1A1A1A' }} contentStyle={{ backgroundColor: '#111', borderColor: '#2A2A2A', borderRadius: '8px' }} />
                                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                                                        {alertTypeData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No alerts detected</div>
                                        )}
                                    </div>
                                </div>
                            </DashboardCard>

                            <DashboardCard title="Top Severity Alerts (Combined)" className="h-[420px]">
                                <div className="flex-1 overflow-y-auto scrollbar-hide pr-2">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead className="sticky top-0 bg-[#111111] z-10">
                                            <tr className="border-b border-[#2A2A2A] text-gray-500 font-mono text-sm uppercase tracking-wider leading-none">
                                                <th className="py-2 font-bold w-3/5">Rule Description</th>
                                                <th className="py-2 font-bold text-center">Level</th>
                                                <th className="py-2 font-bold text-right">Count</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1A1A1A]">
                                            {tableData.length > 0 ? tableData.map((event, idx) => (
                                                <tr key={idx} className="hover:bg-[#1A1A1A] transition-colors group cursor-pointer">
                                                    <td className="py-3 text-gray-300 pr-4">
                                                        <div className="flex items-start space-x-2">
                                                            <Shield size={14} className={`mt-0.5 shrink-0 ${event.level > 10 ? 'text-red-500' : 'text-orange-500'}`} />
                                                            <span className="line-clamp-2 text-xs leading-relaxed" title={event.description}>{event.description}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${event.level > 10 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                            event.level >= 8 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                            }`}>
                                                            LVL {event.level}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-right font-mono text-gray-400 group-hover:text-white transition-colors">
                                                        {event.count.toLocaleString()}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="3" className="py-12 text-center text-gray-500 font-mono text-sm">No critical warning</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </DashboardCard>

                        </div>

                        <DashboardCard title="Alerts level evolution" className="h-[360px]">
                            <div className="w-full h-full pt-4">
                                {timelineData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                                            <XAxis dataKey="time" stroke="#666" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} />
                                            <YAxis
                                                domain={[0, 15]}
                                                ticks={[1, 5, 10, 15]}
                                                stroke="#666"
                                                tick={{ fill: '#666', fontSize: 12, fontWeight: 'bold' }}
                                                tickLine={false}
                                                axisLine={false}
                                            />

                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#111', borderColor: '#2A2A2A', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                                                itemStyle={{ fontWeight: 'bold' }}
                                                formatter={(value) => [`Level ${value}`, 'Max Alert Level']}
                                            />

                                            <Line
                                                type="linear"
                                                dataKey="level"
                                                stroke="#3b82f6"
                                                strokeWidth={3}
                                                dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                                                activeDot={{ r: 6, fill: '#60a5fa', strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-[#2A2A2A] rounded-lg bg-[#0a0a0a]/50">
                                        <Activity size={30} className="text-gray-600 mb-2" />
                                        <p className="text-gray-500 text-xs">No timeline data for selected range</p>
                                    </div>
                                )}
                            </div>
                        </DashboardCard>
                    </div>
                </main>
            </div>
        </div>
    );
}