import { Menu, ChevronRight, Bell, LogOut, ArrowBigDownDash } from "lucide-react"
import { findTitle } from "../helper/support.js"
import { useRouter } from "next/navigation";
import Link from "next/link.js";
import { Exit } from "@/helper/icons.jsx";

export const AppHeader = ({route, hasAlerts = false}) => {
    const router = useRouter();
    const handleAddAgent = async () => {
        alert("Chức năng tạo Agent!");
        router.push('/agent');
    };

    const handleLogout = () => {
        if(confirm("Sếp có chắc chắn muốn đăng xuất không?")) {
            localStorage.removeItem('token');
            router.push('/login');
        }
    };

    return (
        <header className="h-14 border-bottom border-[#2A2A2A] flex items-center px-5 justify-between bg-[#111111]">
            <div className="flex items-center space-y-0 space-x-4">
                <Menu className="text-gray-400 cursor-pointer hover:text-white" size={20} />
                    {findTitle(route).map((e,idx) => (
                        <div key={idx} className="flex items-center text-base font-medium">
                            {idx === 0 && <span className="text-gray-400">{e}</span>}
                            {idx === 0 && <ChevronRight size={16} className="mx-1 text-gray-600" />}
                            {idx === 1 && <span className="bg-[#1D2B3F] text-[#4299E1] px-2 py-0.5 rounded text-base">{e}</span>}
                        </div>
                    ))}
            </div>
                
            <div className="flex items-center space-x-4 text-base">

                <button onClick={handleAddAgent} className="bg-[#1D4ED8] hover:bg-[#2563EB] text-white px-4 py-1.5 rounded font-medium flex items-center space-x-2">
                    <ArrowBigDownDash size={18} />
                    <span>Add agent</span>
                </button>
                <div className="flex items-center justify-center text-black font-bold text-sm mt-1">
                    <img src="https://tinyurl.com/5ybkwhep" className='w-10 h-10 rounded-full object-cover'></img>
                </div>
                <div className="h-6 w-[1px] bg-gray-700"></div>
                <div className="relative cursor-pointer hover:text-white text-gray-400 transition-colors">
                    <Bell size={22} />
                    {hasAlerts && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-[#111]"></span>
                        </span>
                    )}
                </div>
                <button onClick={handleLogout} className="text-red-500 hover:text-white hover:bg-red-600/40 px-3 py-1.5 rounded flex items-center space-x-2 transition-all font-bold group">
                    <Exit className="group-hover:-translate-x-1 transition-transform" />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    )
}
