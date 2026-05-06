'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Rocket, ExternalLink } from 'lucide-react';

import { mockData } from '../../helper/constant.js';
import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';
import { DashboardCard } from '../../helper/renderUI.js';
import { RenderToast } from '../../helper/popUp.js';

import toast, { Toaster } from 'react-hot-toast';

const WorkerList = () => {
  const router = useRouter();
  const [appHeader] = useState('service/worker');
  const { servers, agents } = mockData;

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-[#E0E0E0] overflow-hidden">
      <RenderToast/>
      <SideBar/>
      <main className="flex-1 flex flex-col overflow-hidden">
        <AppHeader route={appHeader} />
        <div className="flex-1 overflow-y-auto p-4 font-inter space-y-4">
          <DashboardCard title="Worker Servers" className="h-fit">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {servers.map((e, idx) => (
                <div
                  key={idx} className="flex flex-row items-center justify-between group p-4 rounded-xl border border-white/5 bg-[#111] hover:bg-[#151515] hover:border-red-500/40 transition-all duration-200">
                    <div className="mb-2 text-xl font-semibold font-mono text-red-400 uppercase tracking-tight"><span className='flex flex-row gap-x-1'><Rocket/>#{e.server_id}</span>
                        <div className="space-y-1 text-base ml-3 mt-1">
                            <p className="text-[#3b82f6]">IP: {e.ip_address}</p>
                            <p className="text-gray-300 uppercase">NODE TYPE: <span className={e.node_type === "master"? 'text-[#fdba74]' : 'text-yellow-300'}>{e.node_type}</span></p>
                        </div>
                    </div>
                    <button className={`text-white font-bold font-mono tracking-tighter py-1 px-4 border border-none rounded uppercase ${e.status === 'active'? 'bg-green-700 hover:bg-green-500' : 
                        e.status === 'busy'? 'bg-[#64748b] hover:bg-[#1e293b]' : 'bg-[#dc2626] hover:bg-[#be185d]'}`}>{e.status}
                    </button>
                </div>
              ))}
            </div>
          </DashboardCard>
          <DashboardCard title="Worker Agents" className="h-fit">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 pt-2">
              {agents.map((e, idx) => (
                <div
                  key={idx} className="flex flex-row items-center justify-between group p-4 rounded-xl border border-white/5 bg-[#111] hover:bg-[#151515] hover:border-red-500/40 transition-all duration-200">
                    <div className="mb-2 text-xl font-semibold font-mono uppercase tracking-tight text-[#22c55e]">#{e.agent_id}
                        <div className="space-y-1 text-base ml-3 mt-1 text-gray-300">
                            <div className="grid grid-cols-[3fr_4fr_1fr] gap-4 mt-2 text-base">
                                <div className='space-y-1'>
                                    <p className="text-[#60a5fa]">Host: {e.name}</p>
                                    <p className="text-[#fef08a]">Mac: {e.mac}</p>
                                    <p className="text-[#3b82f6]">Ip: {e.ip}</p>
                                    <p className="text-white">Description: {e.description}</p>
                                </div>
                                <div className='space-y-1'>
                                    <p className='text-[#fda4af]'><span className="text-white">Auth token:</span>{' '}{e.authToken}</p>
                                    <p className='text-[#f43f5e]'><span className="text-white">Secret key:</span>{' '}{e.key}</p>
                                    <p className='text-[#f9a8d4]'><span className="text-white">IV:</span>{' '}{e.keyIV}</p>
                                    <p className='text-[#f0abfc]'><span className="text-white">Auth tag:</span>{' '}{e.keyAuthTag}</p>
                                </div>
                                <div className='flex items-center justify-center'>
                                    <div className='flex flex-row gap-x-2'>
                                        <button className={`font-bold tracking-tighter py-1 px-4 border-none rounded uppercase 
                                            ${e.status === 'online'? 'bg-green-700 hover:bg-green-500' : 'bg-[#dc2626] hover:bg-[#be185d]'}`}>{e.status}
                                        </button>
                                        <button 
                                            onClick={() => 
                                              {
                                                toast.error("Upcoming"); 
                                                // router.push(`/agent?id=${idx}`);
                                              }}
                                          className="hover:cursor-pointer bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white px-2 py-1 rounded text-sm font-bold uppercase flex items-center space-x-1 ml-auto border border-blue-500/20 transition-all active:scale-95">
                                            <ExternalLink size={14} />
                                            <span>Detail</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      </main>
    </div>
  );
};

export default WorkerList;