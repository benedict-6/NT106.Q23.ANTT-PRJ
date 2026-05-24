'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Server, ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';

export default function AddAgent() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const masterUrl = process.env.NEXT_PUBLIC_MASTER_URL || "http://localhost:3000";
      
      // Giả lập gọi API tạo agent và tải về
      // TODO: Thay thế bằng API endpoint thực tế của backend
      // const res = await fetch(`${masterUrl}/api/dashboard/agents/download`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ description })
      // });
      
      // if (res.ok) {
      //   const blob = await res.blob();
      //   const url = window.URL.createObjectURL(blob);
      //   const a = document.createElement('a');
      //   a.href = url;
      //   a.download = 'agent-setup.sh';
      //   document.body.appendChild(a);
      //   a.click();
      //   window.URL.revokeObjectURL(url);
      // } else {
      //   alert("Lỗi tải Agent");
      // }

      // MOCK BEHAVIOR
      setTimeout(() => {
          const fakeScript = `#!/bin/bash\necho "Installing Antigravity Agent: ${description || 'New Agent'}..."\n# Setup logic here...`;
          const blob = new Blob([fakeScript], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `agent-setup.sh`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          
          setIsDownloading(false);
          alert("Tải Agent thành công! Hãy chạy file này trên máy trạm.");
          router.push('/');
      }, 1500);

    } catch (error) {
      console.error("Lỗi:", error);
      setIsDownloading(false);
      alert("Đã xảy ra lỗi khi tạo agent.");
    }
  };

  return (
    <div className="flex bg-[#050505] min-h-screen text-white font-sans selection:bg-blue-500/30">
      <SideBar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <AppHeader route={['Agents', 'Add New Agent']} />
        
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide flex items-center justify-center">
            
            <div className="w-full max-w-lg bg-[#111111] border border-[#2A2A2A] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-400"></div>
                
                <Link href="/" className="inline-flex items-center space-x-2 text-gray-500 hover:text-white transition-colors mb-8 text-sm font-bold group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Dashboard</span>
                </Link>

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/30 mb-4 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                        <Server size={32} className="text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Deploy New Agent</h2>
                    <p className="text-gray-400 text-center text-sm">Create a new monitoring agent configuration and download the setup script for deployment.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                            <Shield size={14} className="mr-1.5" /> Agent Description / Alias
                        </label>
                        <input 
                            type="text" 
                            placeholder="e.g. Web-Server-01, Database-Primary"
                            className="w-full bg-[#0a0a0a] border border-[#2A2A2A] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-700"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <button 
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className={`w-full py-3.5 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all shadow-lg text-sm ${
                            isDownloading 
                            ? 'bg-blue-600/50 text-white/50 cursor-not-allowed border border-blue-500/20' 
                            : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]'
                        }`}
                    >
                        {isDownloading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Download size={18} className="mr-1" />
                        )}
                        <span>{isDownloading ? 'GENERATING SCRIPT...' : 'DOWNLOAD AGENT SCRIPT'}</span>
                    </button>
                    
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start space-x-3 mt-4">
                        <div className="text-yellow-500 mt-0.5">ℹ️</div>
                        <p className="text-xs text-yellow-500/80 leading-relaxed font-mono">
                            The downloaded script must be run with <b>root</b> privileges on the target machine.
                        </p>
                    </div>
                </div>
            </div>

        </main>
      </div>
    </div>
  );
}
