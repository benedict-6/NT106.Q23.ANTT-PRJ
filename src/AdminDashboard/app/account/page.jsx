"use client"
import Link from 'next/link.js';
import { LogOut } from 'lucide-react';

import React, {useState} from 'react';
import { motion } from 'motion/react';

import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';

import { CompactRow } from '../../helper/renderUI.js';
import { mockData } from '../../helper/constant.js';

const { account } = mockData;

const AccountPage = () => {
  const userData = account;
  const defaultPassDisplay = "••••••••••••••••••••••••••••";
  const [showHash, setShowHash] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A] text-[#E0E0E0] font-sans">
      <SideBar/>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AppHeader route={'account'}/>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
          <div className="scanline opacity-10" />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-lg"
          >
            <div className="bg-[#0D0D0D]/80 backdrop-blur-xl border border-[#2A2A2A] rounded-none p-1 relative overflow-hidden group shadow-2xl">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500/40 group-hover:border-blue-500 transition-colors duration-500" />
              <div className="absolute top-0 right-0 w-2 h-8 bg-blue-500/10" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500/40 group-hover:border-blue-500 transition-colors duration-500" />
              
              <div className="bg-[#111] p-8 border border-[#232323]">
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center mb-10">
                  <div className="relative mb-6">
                    <div className="w-50 h-50 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 p-0.5 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      <div className="w-full h-full rounded-full bg-[#0D0D0D] flex items-center justify-center overflow-hidden">
                        <img src="https://tinyurl.com/5ybkwhep" className='rounded-full object-cover'></img>
                      </div>
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold tracking-tighter text-white uppercase">{userData.username}</h2>
                </div>
                {/* Secure Information Grid */}
                <div className="space-y-6">
                  <CompactRow 
                    label="ID" 
                    value={userData.user_id}
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-row items-center space-x-2 text-gray-500 gap-x-5">
                        <span className="text-base font-bold font-mono uppercase tracking-widest text-[#60a5fa]">Password:</span>
                        <div className={`w-[30ch] min-w-[30ch] max-w-[30ch] text-left overflow-hidden whitespace-nowrap p-2 bg-black/60 border border-white/5 rounded-sm font-mono text-base leading-relaxed transition-all duration-300 ${showHash ? 'text-[#f87171] opacity-100' : 'text-gray-300 opacity-40 select-none blur-[0px]'}`}>
                            {showHash? userData.password.slice(0, 28).padEnd(28, ' ') : defaultPassDisplay}
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowHash(!showHash)}
                        className="hover:cursor-pointer text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest border-b border-blue-500/20"
                      >
                        {showHash ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>

                  <CompactRow 
                    label="Since" 
                    value={userData.created_at} 
                  />
                </div>

                {/* Footer Status */}
                <div className="mt-3 pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                  </div>
                  <Link href="/login">
                  <button className="hover:cursor-pointer border rounded-full px-2 py-3 flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors uppercase text-xs font-bold tracking-tight group">
                    <span>Logout</span>
                    <LogOut size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default AccountPage;