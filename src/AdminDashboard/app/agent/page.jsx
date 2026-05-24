'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';

import { Download, Loader2, CheckCircle2, LoaderCircle } from 'lucide-react';
import { Lazarus, GodotEngine, Linux, Android } from '../../helper/icons.jsx';
import { Windows } from '../../helper/renderUI.js';

export default function CreateAgentPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    agentName: '',
    osType: 'linux',
    description: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateAndDownload = async (e) => {
    e.preventDefault();
    if (!formData.agentName.trim()) {
      alert("HỆ THỐNG: Yêu cầu định danh Agent ID!");
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('token');
    const masterUrl = process.env.NEXT_PUBLIC_MASTER_URL || "http://localhost:3000";

    try {
      const createResponse = await fetch(`${masterUrl}/api/dashboard/agents/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.agentName,
          os: formData.osType,
          description: formData.description
        })
      });

      if (!createResponse.ok) {
        throw new Error('Khởi tạo thông số Agent trên Master Server thất bại.');
      }

      const result = await createResponse.json();
      setSuccessData(result);

      const downloadResponse = await fetch(`${masterUrl}/api/agents/${result.agent_id}/download-installer`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!downloadResponse.ok) {
        throw new Error('Đã cấp ID nhưng gói đóng gói script tải về bị lỗi.');
      }

      const blob = await downloadResponse.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileUrl;
      
      const ext = formData.osType === 'windows' ? 'ps1' : 'sh';
      link.setAttribute('download', `deploy-agent-${formData.agentName.toLowerCase()}.${ext}`);
      
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(fileUrl);

    } catch (error) {
      console.error("[AGENT_CREATION_ERROR]:", error);
      alert(error.message || "Hệ thống gặp sự cố trong quá trình xử lý chuỗi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex h-screen overflow-hidden bg-[#0A0A0A] text-[#E0E0E0] font-sans">
      <SideBar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AppHeader route={'welcome'} />

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
            <div className="flex items-center justify-between border-none mb-4">
              <button 
                onClick={() => router.push('/')}
                className="flex items-center gap-2 font-mono text-md text-gray-500 hover:text-blue-400 transition-colors duration-200 uppercase tracking-widest"
              >
                <Lazarus/>
                <span className='font-mono text-xl font-semibold'>BACK</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 bg-[#0D0D0D]/80 backdrop-blur-xl border border-[#2A2A2A] rounded-none p-1 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500/40 group-hover:border-blue-500 transition-colors duration-500" />
                <div className="absolute top-0 right-0 w-2 h-8 bg-blue-500/10" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500/40 group-hover:border-blue-500 transition-colors duration-500" />
                
                <div className="bg-[#111] p-6 border border-[#232323] space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full">
                      <GodotEngine/>
                    </div>
                    <div>
                      <h3 className="text-md font-semibold font-mono uppercase tracking-widest text-blue-500">Start Engine</h3>
                      <p className="text-sm text-gray-500 font-mono mt-0.5 tracking-tight">Build as you like</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateAndDownload} className="space-y-5 font-mono text-md">
                    <div className="flex flex-col gap-2">
                      <span className="text-lg font-bold tracking-tight text-gray-400 uppercase">Agent Name</span>
                      <input
                        type="text"
                        name="agentName"
                        placeholder="AGENT-00X"
                        value={formData.agentName}
                        onChange={handleInputChange}
                        disabled={isLoading || successData}
                        className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-none px-4 py-2 text-md text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-lg font-bold tracking-tight text-gray-400 uppercase">OS</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                        <div 
                          onClick={() => !(isLoading || successData) && setFormData(p => ({ ...p, osType: 'linux' }))}
                          className={`items-center p-4 border text-md font-bold transition-all duration-300 rounded-none cursor-pointer flex flex-col justify-between ${
                            formData.osType === 'linux'
                              ? "bg-blue-950/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                              : "bg-[#0A0A0A] border-[#2A2A2A] text-gray-500 hover:text-gray-300 hover:border-[#333]"
                          }`}
                        >
                            <div className='flex flex-row gap-x-2 items-center'>
                                <Linux/>
                                <span className="text-md font-bold uppercase tracking-wide">Linux</span>
                            </div>
                        </div>
                        <div 
                          onClick={() => !(isLoading || successData) && setFormData(p => ({ ...p, osType: 'windows' }))}
                          className={`items-center p-4 border text-md font-bold transition-all duration-300 rounded-none cursor-pointer flex flex-col justify-between ${
                            formData.osType === 'windows'
                              ? "bg-blue-950/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                              : "bg-[#0A0A0A] border-[#2A2A2A] text-gray-500 hover:text-gray-300 hover:border-[#333]"
                          }`}
                        >
                        <div className='flex flex-row items-center gap-x-2'>
                            <Windows/>
                            <span className="text-md font-bold uppercase tracking-wide">Windows</span>
                        </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-md font-bold tracking-widest text-gray-400 uppercase">Configuration</span>
                      <textarea
                        name="description"
                        rows="3"
                        placeholder="Configure as guide docs"
                        value={formData.description}
                        onChange={handleInputChange}
                        disabled={isLoading || successData}
                        className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-none px-4 py-3 text-md text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500 disabled:opacity-50 resize-none transition-colors"
                      />
                    </div>
                    {!successData && (
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold tracking-widest uppercase py-3 border-b-2 border-blue-400 hover:bg-blue-700 shadow-[0_0_15px_rgba(59,130,246,0.2)] rounded-sm transition-all duration-300 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Đang mã hóa định danh & đóng gói binary...
                          </>
                        ) : (
                          <>
                            <Download size={20} />
                            download
                          </>
                        )}
                      </button>
                    )}
                  </form>
                </div>
              </div>

              <div className="bg-[#0D0D0D]/80 backdrop-blur-xl border border-[#2A2A2A] rounded-none p-1 relative overflow-hidden group shadow-2xl min-h-[415px] flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500/40 group-hover:border-blue-500 transition-colors duration-500" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500/40 group-hover:border-blue-500 transition-colors duration-500" />
                
                <div className="bg-[#111] p-5 border border-[#232323] h-full flex flex-col justify-between flex-1 space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <span className="text-sm font-bold font-mono text-gray-400 flex items-center gap-1.5 uppercase tracking-widest">
                        <Android/> Progress
                      </span>
                      <span className={`h-2 w-2 rounded-full ${successData ? "bg-green-400 animate-pulse" : "bg-red-500"}`} />
                    </div>

                    {!successData ? (
                      <div className="text-white flex flex-row space-x-2 text-sm font-mono text-gray-600 py-16 text-center tracking-wide leading-relaxed">
                        <LoaderCircle size={20} className="animate-spin"/>
                        <span>Loading data...</span>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-fadeIn font-mono">
                        <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-wider">
                          <CheckCircle2 size={15} /> Đã kích hoạt ID: {successData.agent_id}
                        </div>
                        
                        <div className="bg-[#050505] p-3 border border-[#232323] text-[11px] text-green-500 space-y-2 overflow-x-auto leading-relaxed">
                          <p className="text-gray-600"># Chạy lệnh sau tại máy chủ mục tiêu với quyền Root/Admin:</p>
                          {formData.osType === 'linux' ? (
                            <>
                              <p className="text-gray-300">chmod +x deploy-agent-{formData.agentName.toLowerCase()}.sh</p>
                              <p className="text-blue-400">sudo ./deploy-agent-{formData.agentName.toLowerCase()}.sh --token={successData.activation_token || "AUTH_TOKEN_HASH"}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-gray-300">Set-ExecutionPolicy Bypass -Scope Process -Force</p>
                              <p className="text-blue-400">.\deploy-agent-{formData.agentName.toLowerCase()}.ps1 -Token "{successData.activation_token || "AUTH_TOKEN_HASH"}"</p>
                            </>
                          )}
                        </div>
                        
                        <p className="text-[10px] text-gray-500 leading-normal">
                          * Tệp cấu hình script đã được đẩy xuống qua luồng download của trình duyệt. Vui lòng kiểm tra thư mục Tải về.
                        </p>
                      </div>
                    )}
                  </div>

                  {successData && (
                    <button 
                      onClick={() => {
                        setSuccessData(null);
                        setFormData({ agentName: '', osType: 'linux', description: '' });
                      }}
                      className="w-full text-center border border-[#2A2A2A] hover:border-blue-500/50 text-gray-500 hover:text-blue-400 font-mono text-xs py-2.5 rounded-none transition-colors duration-200 uppercase tracking-widest bg-[#0A0A0A]"
                    >
                      &gt;&gt; Khởi tạo Agent khác
                    </button>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}