"use client";
import Link from 'next/link.js';

import { LayoutDashboard, Shield, WifiPen, FileClock } from 'lucide-react'
import { usePathname } from 'next/navigation';
import { SidebarIcon } from '../helper/renderUI.js'
import { FIM, App } from '@/helper/icons.jsx';

export const SideBar = () => {
    const pathname = usePathname();
    return (
        <aside className="w-64 flex-shrink-0 border-r border-[#2A2A2A] flex flex-col py-6 px-4 space-y-6">
            <div className="flex items-center space-x-3 px-2 mb-4">
                <img src="https://tinyurl.com/2wazsjyv" className='w-10 h-10 rounded-full object-cover' alt="logo" />
                <span className="text-white font-mono font-bold text-sm tracking-widest uppercase">SIEM Admin</span>
            </div>
            <nav className="flex flex-col space-y-2 w-full">
                <Link href="/" className="w-full"><SidebarIcon icon={<LayoutDashboard size={20} />} active={pathname === '/'} title="DASHBOARD" /></Link>

                <Link href="/monitor_fim" className="w-full"><SidebarIcon icon={<FIM size={20} />} active={pathname === '/monitor_fim'} title="FIM MONITOR" /></Link>

                <Link href="/monitor_netpro" className="w-full"><SidebarIcon icon={<WifiPen size={20} />} active={pathname === '/monitor_netpro'} title="NET & PROCESS" /></Link>

                <Link href="/monitor_app" className="w-full"><SidebarIcon icon={<App size={20} />} active={pathname === '/monitor_app'} title="APP MONITOR" /></Link>

                <Link href="/monitor_log" className="w-full"><SidebarIcon icon={<FileClock size={20} />} active={pathname === '/monitor_log'} title="SYSTEM LOGS" /></Link>
            </nav>
        </aside>
    )
}