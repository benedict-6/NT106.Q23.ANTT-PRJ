'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, Layers, Network, Terminal } from "lucide-react";

export const SideBar = () => {
    const pathname = usePathname();

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'File Integrity (FIM)', icon: ShieldCheck, path: '/fim' },
        { name: 'Applications', icon: Layers, path: '/apps' },
        { name: 'Network (Netpro)', icon: Network, path: '/netpro' },
        { name: 'Logs General', icon: Terminal, path: '/logs' }
    ];

    return (
        <aside className="w-64 bg-[#0a0a0a] border-r border-[#2A2A2A] h-screen flex flex-col shrink-0 transition-all duration-300 shadow-2xl relative z-20">
            <div className="pt-10 pb-8 flex flex-col items-center justify-center border-b border-[#2A2A2A]/50 relative">
                {/* Hiệu ứng ánh sáng nền sau logo */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>
                
                {/* Khung viền Logo */}
                <div className="relative w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-blue-600 to-cyan-400 shadow-[0_0_25px_rgba(37,99,235,0.25)] hover:scale-105 transition-transform duration-500 cursor-pointer">
                    <img 
                        src="https://tinyurl.com/2wazsjyv" 
                        alt="Logo" 
                        className="w-full h-full object-cover rounded-full bg-[#111] border-4 border-[#111]"
                    />
                </div>
            </div>

            {/* MENU LINKS  */}
            <nav className="flex-1 py-8 px-4 space-y-2.5 overflow-y-auto scrollbar-hide">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-6 px-3">
                    System Monitor
                </div>
                
                {menuItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link key={item.name} href={item.path}>
                            <div className={`flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-300 cursor-pointer group ${
                                isActive 
                                ? 'bg-gradient-to-r from-blue-600/20 to-transparent text-blue-400 border-l-2 border-blue-500 shadow-sm' 
                                : 'text-gray-400 hover:bg-[#1A1A1A] hover:text-gray-100 border-l-2 border-transparent'
                            }`}>
                                <Icon size={22} className={`${isActive ? 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-gray-500 group-hover:text-gray-300 group-hover:scale-110'} transition-all duration-300`} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[15px] tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                            </div>
                        </Link>
                    )
                })}
            </nav>

            {/* FOOTER */}
            <div className="p-5 border-t border-[#2A2A2A]/50 bg-[#0a0a0a]">
                <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono font-bold tracking-widest uppercase">
                    <span>Version</span>
                    <span className="bg-[#1A1A1A] px-2.5 py-1 rounded-md text-blue-400 border border-blue-900/30 shadow-inner">V4.8.0</span>
                </div>
            </div>
        </aside>
    )
}