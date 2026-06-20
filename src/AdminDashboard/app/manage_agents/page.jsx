'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';

import { Trash2, Loader2, AlertCircle, Shield } from 'lucide-react';

export default function ManageAgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_MASTER_URL}/api/dashboard/agents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách agents');
      }

      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error("[FETCH_AGENTS_ERROR]:", error);
      alert("Lỗi khi tải danh sách agents.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (agentId) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa toàn bộ dữ liệu của Agent: ${agentId}? Hành động này không thể hoàn tác!`)) {
      return;
    }

    setIsDeleting(agentId);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_MASTER_URL}/api/dashboard/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Lỗi khi xóa agent');
      }

      setAgents(agents.filter(a => a.agent_id !== agentId));
      alert("Xóa agent thành công!");
    } catch (error) {
      console.error("[DELETE_AGENT_ERROR]:", error);
      alert("Đã xảy ra lỗi khi xóa agent.");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="w-full flex h-screen overflow-hidden bg-[#0A0A0A] text-[#E0E0E0] font-sans">
      <SideBar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AppHeader route={'manage_agents'} />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[160px]" />
          <div className="scanline opacity-10" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-7xl mx-auto space-y-5"
          >
            <div className="flex items-center justify-between border-none mb-4">
              <h2 className="font-mono text-xl font-bold tracking-widest uppercase text-white flex items-center gap-2">
                <Shield size={24} className="text-red-500" /> Manage Agents
              </h2>
            </div>

            <div className="bg-[#0D0D0D]/80 backdrop-blur-xl border border-[#2A2A2A] rounded-none p-1 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500/40 group-hover:border-red-500 transition-colors duration-500" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500/40 group-hover:border-red-500 transition-colors duration-500" />

              <div className="bg-[#111] p-6 border border-[#232323] overflow-x-auto min-h-[400px]">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 space-y-4">
                    <Loader2 size={32} className="animate-spin text-red-500" />
                    <span className="font-mono text-sm tracking-widest uppercase">Loading Agents Data...</span>
                  </div>
                ) : agents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 space-y-4">
                    <AlertCircle size={32} className="text-gray-600" />
                    <span className="font-mono text-sm tracking-widest uppercase">No Agents Found</span>
                  </div>
                ) : (
                  <table className="w-full text-left font-mono text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A2A] text-gray-400">
                        <th className="py-4 px-4 uppercase tracking-widest font-bold">Agent ID</th>
                        <th className="py-4 px-4 uppercase tracking-widest font-bold">Name (Hostname)</th>
                        <th className="py-4 px-4 uppercase tracking-widest font-bold">IP Address</th>
                        <th className="py-4 px-4 uppercase tracking-widest font-bold">Status</th>
                        <th className="py-4 px-4 uppercase tracking-widest font-bold">Created At</th>
                        <th className="py-4 px-4 uppercase tracking-widest font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((agent) => (
                        <tr key={agent.agent_id} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors">
                          <td className="py-4 px-4 text-blue-400 font-bold">{agent.agent_id}</td>
                          <td className="py-4 px-4 text-gray-300">{agent.hostname || 'Unknown'}</td>
                          <td className="py-4 px-4 text-gray-400">{agent.ip_address || 'N/A'}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-sm ${agent.agent_status === 'online' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                              {agent.agent_status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-500">{new Date(agent.created_at).toLocaleString()}</td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleDelete(agent.agent_id)}
                              disabled={isDeleting === agent.agent_id}
                              className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded transition-colors disabled:opacity-50 flex items-center justify-center ml-auto gap-2"
                              title="Delete Agent"
                            >
                              {isDeleting === agent.agent_id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                              <span className="text-xs uppercase font-bold tracking-widest">Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
