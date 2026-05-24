"use client";
import Link from 'next/link.js';

import { LayoutDashboard, Shield, WifiPen, FileClock } from 'lucide-react'
import { usePathname } from 'next/navigation';
import { SidebarIcon } from '../helper/renderUI.js'
import { FIM, App } from '@/helper/icons.jsx';

export const SideBar = () => {
    const pathname = usePathname();
    return (
        <aside className="w-16 flex-shrink-0 border-r border-[#2A2A2A] flex flex-col items-center py-4 space-y-6">
            <div className="flex items-center justify-center mb-4">
                <img src="https://tinyurl.com/2wazsjyv" className='w-12 h-12 rounded-full object-cover'></img>
            </div>
            <nav className="flex flex-col space-y-4">
                <Link href="/"><SidebarIcon icon={<LayoutDashboard size={22} />} active={pathname === '/'}/></Link>

                <Link href="/monitor_fim"><SidebarIcon icon={<FIM/>} active={pathname === '/monitor_fim'}/></Link>

                <Link href="/monitor_netpro"><SidebarIcon icon={<WifiPen size={22} />} active={pathname === '/monitor_netpro'}></SidebarIcon></Link>

                <Link href="/monitor_app"><SidebarIcon icon={<App/>} active={pathname === '/monitor_app'}/></Link>

                <Link href="/monitor_log"><SidebarIcon icon={<FileClock/>} active={pathname === '/monitor_log'}/></Link>
            </nav>
      </aside>
    )
}