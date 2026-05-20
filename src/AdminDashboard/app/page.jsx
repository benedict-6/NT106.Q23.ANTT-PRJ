'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Plus, Download, HelpCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link.js';

import { topAgentsData, eventLocationData, criticalEvents, highEvents, locationItems } from '../helper/constant.js';
import { drawPie } from '../chart/pie.js';
import { drawEPS } from '../helper/eps.js';
import { DashboardCard } from '../helper/renderUI.js';
import { Top5PercentBarChart } from '../chart/bar.js';
import { processedEventLocationData } from '../helper/support.js';

import { SideBar } from '../components/sidebar.jsx';
import { AppHeader } from '../components/header.jsx';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const processedELData = processedEventLocationData(eventLocationData);

  // 1. SỬA LẠI HÀM LOGOUT
  const handleLogout = () => {
    // Xóa thẻ bài khỏi túi
    localStorage.removeItem('token');
    // Đá về trang đăng nhập
    router.push('/login');
  }

  // 2. GẮN KHIÊN BẢO VỆ ROUTE GUARD
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
    } else {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const role = payload._role || payload.role;

        if (role === 'admin') {
          router.push('/admin');
        } else {
          setMounted(true);

          // ==========================================
          //  WEBSOCKET VIEWER
          // ==========================================
          const ws = new WebSocket('ws://localhost:6001');

          ws.onopen = () => {
            console.log("[Viewer Socket] Native WebSocket đã kết nối!");
            ws.send(JSON.stringify({ type: 'REGISTER_UI', token: token }));
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log("Dữ liệu từ Master:", data);
              if (data.type === 'NEW_ALERT_UI') {
                alert(`CẢNH BÁO: File ${data.payload.file_path} vừa bị sửa!`);
              }
            } catch (err) {
              console.error("Lỗi đọc Socket:", err);
            }
          };

          ws.onerror = (error) => console.error("[Viewer Socket] Lỗi WebSocket:", error);
          ws.onclose = () => console.log("[Viewer Socket] WebSocket đã đóng.");

          return () => {
            if (ws.readyState === 1) ws.close();
          };
        }
      } catch (e) {
        console.error(e);
        localStorage.removeItem('token');
        router.push('/login');
      }
    }
  }, [router]);


  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A] text-[#E0E0E0] font-sans">
      {/* Sidebar - Mini rail */}
      <SideBar handleFunc={handleLogout} />
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <AppHeader route={"dashboard"} />
        {/* Dashboard Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-9 bg-[#0A0A0A]">
          {/* Top Row: Gauge, Pie, Location Legend */}
          <div className="grid grid-cols-12 gap-2 h-[300px]">
            {/* EPS Gauge */}
            <DashboardCard title="EPS Count" className="col-span-3 overflow-hidden">
              <div className="flex flex-col items-center justify-center h-full relative pointer-events-none">
                {drawEPS(0.8)}
                <span className="text-lg text-secondary opacity-60">Overall Average of Count</span>
              </div>
            </DashboardCard>

            {/* Top 3 Agents Pie */}
            <DashboardCard title="Top 3 Agents by Log Count" className="col-span-4">
              <div className="w-full flex items-center h-64">
                <div className="w-[70%] h-full min-w-0 pointer-events-none">
                  {drawPie(topAgentsData)}
                </div>
                <div className="space-y-2 pr-4">
                  {topAgentsData.map((agent) => (
                    <div key={agent.name} className="flex items-center space-x-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color }} />
                      <span className="text-gray-400 whitespace-nowrap">{agent.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardCard>

            {/* Event Location Legends */}
            <DashboardCard title="Event - Location" className="col-span-5">
              <div className="grid grid-cols-4 gap-y-2 gap-x-4 p-2 text-[10px] text-gray-400 h-full overflow-y-auto">
                {locationItems.map(item => (
                  <div key={item.name} className="flex items-center space-x-1.5 truncate">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </div>
                ))}
              </div>
              {/* Mini bar chart top 5 */}
              <div className="h-30 w-full mt-7 bg-[#1A1A1A] rounded p-2 flex items-end space-x-0.5">
                <Top5PercentBarChart data={processedELData} />
              </div>
            </DashboardCard>
          </div>

          {/* Middle Row: Critical Events, Disconnected, High Events */}
          <div className="grid grid-cols-12 gap-2 flex-1 min-h-[250px]">
            {/* Critical Events Table */}
            <DashboardCard title="Critical Events" className="col-span-5 flex flex-col">
              <div className="flex-1 overflow-hidden mt-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-gray-400">
                      <th className="py-2 font-medium">Rule Description <ChevronRight size={12} className="inline rotate-90" /></th>
                      <th className="py-2 font-medium">Rule Level <ChevronRight size={12} className="inline rotate-90" /></th>
                      <th className="py-2 font-medium">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232323]">
                    {criticalEvents.map(event => (
                      <tr key={event.id} className="hover:bg-[#151515] transition-colors">
                        <td className="py-3 pr-4 text-gray-300">{event.description}</td>
                        <td className="py-3 text-gray-300">{event.level}</td>
                        <td className="py-3 text-gray-300">{event.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>

            {/* Agent Stats */}
            <div className="col-span-2 flex flex-col gap-4">
              <DashboardCard title="Disconnected Agents" className="flex flex-col items-center justify-center text-center">
                <div className='flex flex-col items-center justify-center mt-4'>
                  <span className="text-7xl font-bold text-[#e11d48] mb-2">0</span>
                  <span className="text-base text-gray-500">Disconnected Agents</span>
                </div>
              </DashboardCard>
              <DashboardCard title="Active Agents" className="flex-1 flex flex-col items-center">
                <div className='flex flex-col items-center justify-center mt-4'>
                  <span className="text-7xl font-bold text-[#4ade80] mb-2">4</span>
                  <span className="text-base text-gray-500">Active Agents</span>
                </div>
              </DashboardCard>
            </div>

            {/* High Events Table */}
            <DashboardCard title="High Events" className="col-span-5 flex flex-col">
              <div className="flex-1 overflow-hidden mt-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-gray-400">
                      <th className="py-2 font-medium">Rule Description <ChevronRight size={12} className="inline rotate-90" /></th>
                      <th className="py-2 font-medium">Rule Level <ChevronRight size={12} className="inline rotate-90" /></th>
                      <th className="py-2 font-medium text-right pr-4">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232323]">
                    {highEvents.map(event => (
                      <tr key={event.id} className="hover:bg-[#151515] transition-colors">
                        <td className="py-3 pr-4 text-gray-300">{event.description}</td>
                        <td className="py-3 text-gray-300">{event.level}</td>
                        <td className="py-3 text-gray-300 text-right pr-4 tracking-tighter">{event.count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          </div>
        </div>
      </main>
    </div>
  );
}



