import { Menu, ChevronRight, Bell, LogOut, ArrowBigDownDash, ShieldAlert, X } from "lucide-react"
import { findTitle } from "../helper/support.js"
import { useRouter } from "next/navigation";
import Link from "next/link.js";
import { Exit } from "@/helper/icons.jsx";
import { useState, useRef, useEffect } from "react";

export const AppHeader = ({route, hasAlerts: initialHasAlerts = false}) => {
    const router = useRouter();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [recentAlerts, setRecentAlerts] = useState([]);
    const [loadingAlerts, setLoadingAlerts] = useState(false);
    const [hasUnreadAlerts, setHasUnreadAlerts] = useState(initialHasAlerts);
    const dropdownRef = useRef(null);

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

    useEffect(() => {
        // Fetch initial alerts
        const fetchInitialAlerts = async () => {
            setLoadingAlerts(true);
            const token = localStorage.getItem('token');
            const masterUrl = process.env.NEXT_PUBLIC_MASTER_URL || "http://localhost:3000";
            try {
                const res = await fetch(`${masterUrl}/api/dashboard/alerts`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.alerts) {
                        const sorted = data.alerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                        setRecentAlerts(sorted.slice(0, 10));
                    }
                }
            } catch (err) {
                console.error("Lỗi khi load alert header", err);
            } finally {
                setLoadingAlerts(false);
            }
        };

        fetchInitialAlerts();

        // Listen for realtime alerts from socket
        const handleNewAlert = (event) => {
            const newAlert = event.detail;
            setRecentAlerts(prev => {
                const updated = [newAlert, ...prev];
                return updated.slice(0, 10); // Keep only 10
            });
            setHasUnreadAlerts(true); // Bật dấu chấm đỏ khi có cảnh báo mới
        };
        window.addEventListener('NEW_SIEM_ALERT', handleNewAlert);

        // Click outside logic
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsAlertOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            window.removeEventListener('NEW_SIEM_ALERT', handleNewAlert);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const toggleAlerts = () => {
        setIsAlertOpen(!isAlertOpen);
        if (!isAlertOpen) {
            setHasUnreadAlerts(false); // Tắt dấu chấm đỏ khi mở xem
        }
    };

    return (
        <header className="h-16 border-b border-[#2A2A2A] flex items-center px-6 justify-between bg-[#111111] z-50">
            <div className="flex items-center space-y-0 space-x-4">
                <Menu className="text-gray-400 cursor-pointer hover:text-white" size={24} />
                    {findTitle(route).map((e,idx) => (
                        <div key={idx} className="flex items-center text-lg font-medium">
                            {idx === 0 && <span className="text-gray-400">{e}</span>}
                            {idx === 0 && <ChevronRight size={20} className="mx-2 text-gray-600" />}
                            {idx === 1 && <span className="bg-[#1D2B3F] text-[#4299E1] px-3 py-1 rounded text-lg">{e}</span>}
                        </div>
                    ))}
            </div>
                
            <div className="flex items-center space-x-5 text-lg">

                <button onClick={handleAddAgent} className="bg-[#1D4ED8] hover:bg-[#2563EB] text-white px-5 py-2 rounded font-medium flex items-center space-x-2">
                    <ArrowBigDownDash size={22} />
                    <span>Add agent</span>
                </button>
                <div className="flex items-center justify-center text-black font-bold text-sm mt-1">
                    <img src="https://tinyurl.com/5ybkwhep" className='w-12 h-12 rounded-full object-cover'></img>
                </div>
                <div className="h-8 w-[1px] bg-gray-700"></div>
                
                <div className="relative" ref={dropdownRef}>
                    <div onClick={toggleAlerts} className="cursor-pointer hover:text-white text-gray-400 transition-colors p-2">
                        <Bell size={28} />
                        {hasUnreadAlerts && (
                            <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-[#111]"></span>
                            </span>
                        )}
                    </div>

                    {isAlertOpen && (
                        <div className="absolute top-12 right-0 w-[28rem] bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-2xl overflow-hidden z-50 flex flex-col max-h-[36rem]">
                            <div className="flex justify-between items-center p-4 border-b border-[#2A2A2A] bg-[#111]">
                                <span className="font-bold text-white text-base">Recent Alerts</span>
                                <X size={20} className="text-gray-400 cursor-pointer hover:text-white" onClick={() => setIsAlertOpen(false)} />
                            </div>
                            <div className="overflow-y-auto flex-1 p-3 space-y-3 scrollbar-hide">
                                {loadingAlerts ? (
                                    <div className="text-center text-gray-400 p-4 text-xs">Loading...</div>
                                ) : recentAlerts.length > 0 ? (
                                    recentAlerts.map(alert => (
                                        <div key={alert.id} className="bg-[#111] p-3 rounded-lg border border-[#2A2A2A] flex flex-col space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span 
                                                    className="text-sm text-gray-400 font-mono cursor-pointer hover:text-blue-400 transition-colors"
                                                    title="Click to copy full ID to search"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(alert.id);
                                                    }}
                                                >
                                                    ID: #{alert.id}
                                                </span>
                                                <div className="flex items-center space-x-2">
                                                    {alert.agent_id && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono" title={`Agent ID: ${alert.agent_id}`}>
                                                            {alert.agent_id}
                                                        </span>
                                                    )}
                                                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                                                        alert.packet_level > 10 ? 'bg-red-500/20 text-red-400' : 
                                                        alert.packet_level >= 8 ? 'bg-orange-500/20 text-orange-400' : 
                                                        'bg-blue-500/20 text-blue-400'
                                                    }`}>LVL {alert.packet_level}</span>
                                                </div>
                                            </div>
                                            <div className="text-base text-gray-200 font-semibold leading-tight line-clamp-2">
                                                {alert.rule_name || "Unknown Rule"}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {new Date(alert.created_at || alert.timestamp || Date.now()).toLocaleString('vi-VN')}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 p-6 text-sm">No alerts found.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={handleLogout} className="text-red-500 hover:text-white hover:bg-red-600/40 px-4 py-2 rounded font-bold flex items-center space-x-2 transition-all group">
                    <Exit className="group-hover:-translate-x-1 transition-transform w-5 h-5" />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    )
}
