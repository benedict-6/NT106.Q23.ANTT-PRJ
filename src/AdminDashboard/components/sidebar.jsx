"use client";
import Link from 'next/link.js';

import { LayoutDashboard, Shield, CirclePower, Pickaxe, PersonStanding, Bell, Settings } from 'lucide-react'
import { usePathname } from 'next/navigation';
import { SidebarIcon } from '../helper/renderUI.js'

export const SideBar = () => {
    const pathname = usePathname();
    return (
        <aside className="w-16 flex-shrink-0 border-r border-[#2A2A2A] flex flex-col items-center py-4 space-y-6">
            <div className="flex items-center justify-center mb-4">
                <img src="https://tinyurl.com/2wazsjyv" className='w-12 h-12 rounded-full object-cover'></img>
            </div>
            <nav className="flex flex-col space-y-4">
                <Link href="/"><SidebarIcon icon={<LayoutDashboard size={22} />} active={pathname === '/'}/></Link>

                <Link href="/admin"><SidebarIcon icon={<Shield size={22} />} active={pathname === '/admin'}/></Link>

                <Link href="/service"><SidebarIcon icon={<Pickaxe size={22} />} active={pathname === '/service'}></SidebarIcon></Link>

                <Link href="/account"><SidebarIcon icon={<PersonStanding size={22}/>} active={pathname === '/account'}/></Link>

                <Link href="/login"><SidebarIcon icon={<CirclePower size={22} />} active={pathname === '/login'}/></Link>
            </nav>
            <div className="mt-auto flex flex-col space-y-4">
                <SidebarIcon icon={<Bell size={22} />} />

                <SidebarIcon icon={<Settings size={22} />} />
            </div>
      </aside>
    )
}