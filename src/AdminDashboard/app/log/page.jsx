'use client';

import React, {Suspense} from 'react';
import { useSearchParams } from 'next/navigation';
import { Terminal, RefreshCcw } from 'lucide-react';

import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';

import { LogLine } from '../../helper/renderUI.js';
import { mockData } from '../../helper/constant.js';

const { detailLog } = mockData;

const LogContent = () => {
  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader route={'diary'}/>
        <div className="flex-1 overflow-hidden p-6 flex flex-col space-y-6">
            {/* Status Bar */}
            <div className="flex items-center justify-between bg-[#111] border border-[#2A2A2A] p-4 rounded-sm">
            <div className="flex items-center space-x-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
                <div>
                    <p className="text-base font-bold text-white uppercase tracking-widest">Connection</p>
                    <p className="text-xs font-bold text-[#60a5fa] uppercase tracking-tighter mt-2">Status: Good</p>
                </div>
            </div>
            <div className="flex items-center space-x-6 text-sm font-mono text-gray-500 uppercase font-mono">
                <button className="p-2 border border-[#333] hover:border-blue-500 transition-colors rounded">
                    <RefreshCcw size={14} onClick={() => window.location.reload()}/>
                </button>
            </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
            {/* Log Terminal */}
            <div className="lg:col-span-2 flex flex-col bg-black border border-[#2A2A2A] rounded-sm overflow-hidden shadow-2xl">
                <div className="bg-[#111] border-b border-[#2A2A2A] px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Terminal size={20} className="text-blue-500" />
                        <span className="text-base font-bold text-gray-400 uppercase tracking-widest">LOG EVENTS</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-red-500/20" />
                        <div className="w-2 h-2 rounded-full bg-orange-500/20" />
                        <div className="w-2 h-2 rounded-full bg-green-500/20" />
                    </div>
                </div>
                    <div className="relative flex-1 overflow-y-auto p-4 font-mono text-base space-y-1">
                        {/* Background layer */}
                        <div className="absolute inset-0 bg-[url('https://tinyurl.com/yncydvn5')] bg-cover bg-center bg-no-repeat opacity-20 blur-[2px]" />
                        {/* Overlay màu theme */}
                        <div className="absolute inset-0 bg-[#0A0A0A]/80" />
                        {/* Content */}
                        <div className="relative z-10">
                            {detailLog.map((e, idx) => (
                            <LogLine key={idx} time={e.time} type={e.type} msg={e.msg}/>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
  );
}

const DetailLogPage = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A] text-[#E0E0E0] font-inter">
      <SideBar />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center font-mono text-2xl text-blue-400 animate-pulse">
            LOADING... PLEASE WAIT IN SECONDS
        </div>
      }>
        <LogContent />
      </Suspense>
    </div>
  );
}

export default DetailLogPage;


