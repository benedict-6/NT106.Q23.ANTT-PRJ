'use client';

import { Menu, ChevronRight, ArrowBigDownDash, Bell, LogOut } from "lucide-react"
import { useRouter } from "next/navigation";

export const AppHeader = ({route}) => {
    const router = useRouter();

    // Hàm tạo Agent 
    const handleAddAgent = () => {
        router.push('/add-agent');
    };

    // NÚT NGUỒN LOGOUT
    const handleLogout = () => {
        if(confirm("Sếp có chắc chắn muốn đăng xuất không?")) {
            localStorage.removeItem('token');
            router.push('/login');
        }
    };

    return (
        <header className="h-14 border-b border-[#2A2A2A] flex items-center px-5 justify-between bg-[#111111] shrink-0">
            {/* Breadcrumb bên trái */}
            <div className="flex items-center space-x-4">
                <Menu className="text-gray-400 cursor-pointer hover:text-white transition-colors" size={20} />
                {Array.isArray(route) && route.map((e,idx) => (
                    <div key={idx} className="flex items-center text-base font-medium">
                        {idx === 0 && <span className="text-gray-400">{e}</span>}
                        {idx === 0 && <ChevronRight size={16} className="mx-1 text-gray-600" />}
                        {idx === 1 && <span className="bg-[#1D2B3F] text-[#4299E1] px-2 py-0.5 rounded text-base uppercase tracking-wider">{e}</span>}
                    </div>
                ))}
            </div>
                
            {/* Cụm công cụ bên phải */}
            <div className="flex items-center space-x-5 text-base">
                
                {/* CHUÔNG THÔNG BÁO REALTIME */}
                <div className="relative cursor-pointer hover:text-white text-gray-400 transition-colors">
                    <Bell size={22} />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-[#111]"></span>
                    </span>
                </div>
                
                {/* NÚT ADD AGENT */}
                <button onClick={handleAddAgent} className="bg-[#1D4ED8] hover:bg-[#2563EB] text-white px-4 py-1.5 rounded font-bold flex items-center space-x-2 transition-all">
                    <ArrowBigDownDash size={18} />
                    <span>Add agent</span>
                </button>
                
                {/* AVATAR */}
                <div className="flex items-center justify-center border-2 border-gray-600 rounded-full cursor-pointer hover:border-gray-400 transition-colors">
                    <img src="https://ui-avatars.com/api/?name=Admin&background=random" className='w-8 h-8 rounded-full object-cover' alt="avatar" />
                </div>

                <div className="h-6 w-[1px] bg-gray-700"></div> {/* Đường kẻ dọc chia cách */}

                {/* NÚT NGUỒN LOGOUT */}
                <button onClick={handleLogout} className="text-red-500 hover:text-white hover:bg-red-600 px-3 py-1.5 rounded flex items-center space-x-2 transition-all font-bold group">
                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    )
}
