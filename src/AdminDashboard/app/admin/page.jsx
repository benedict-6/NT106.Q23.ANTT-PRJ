'use client';

import React, { useState, useEffect  } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Wifi, ExternalLink, FileText, Terminal as TerminalIcon, Apple } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link.js';

import { mockData } from '../../helper/constant';
import { SideBar } from '../../components/sidebar.jsx';
import { AppHeader } from '../../components/header.jsx';
import { DashboardCard } from '../../helper/renderUI.js';
import { TabItem, Table, THead } from '../../helper/renderUI.js';
import { AlertCard } from '../../components/warning.jsx'

export default function AdminFleetView() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('users');
  // Future Plan feature
  const [search, setSearch] = useState('');
  const [appHeader, setAppHeader] = useState('security');

  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
      const token = localStorage.getItem('token');
      
      if (!token) {
          router.push('/login');
          return; 
      }

      try {
          // Giải mã Token để đọc thông tin bên trong
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(base64));

          // Kiểm tra xem có phải Admin không 
          if (payload._role !== 'admin' && payload.role !== 'admin') {
              alert("BẠN KHÔNG CÓ QUYỀN TRUY CẬP VÀO KHU VỰC QUẢN TRỊ!");
              router.push('/'); 
          }

          setIsAuthorized(true);
          // ==========================================
          // NATIVE WEBSOCKET (PORT 6001)
          // ==========================================
          const ws = new WebSocket('ws://localhost:6001'); 

          ws.onopen = () => {
              console.log("[Admin Socket] WebSocket đã kết nối!");
              ws.send(JSON.stringify({ type: 'REGISTER_UI', token: token }));
          };

          ws.onmessage = (event) => {
              try {
                  const data = JSON.parse(event.data);
                  console.log("Dữ liệu từ Master:", data);
                  if (data.type === 'FIM_ALERT_UI') {
                      alert(`CẢNH BÁO: File ${data.payload.file_path} vừa bị sửa!`); 
                  }
              } catch (err) {
                  console.error("Lỗi đọc dữ liệu Socket:", err);
              }
          };

          ws.onerror = (error) => console.error("[Admin Socket] Lỗi WebSocket:", error);
          ws.onclose = () => console.log("[Admin Socket] WebSocket đã đóng.");

          return () => {
              if (ws.readyState === 1) ws.close();
          };
      } catch (error) {
          console.error("Token bị lỗi hoặc bị ai đó sửa:", error);
          localStorage.removeItem('token');
          router.push('/login');
      }
  }, [router]);

  // BLOCK BEFORE REDERING PAGE
  if (!isAuthorized) {
    return <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-blue-500 font-mono animate-pulse">INITIALIZING SECURE CONNECTION...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A] text-[#E0E0E0] font-sans">
      <SideBar/>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader route={appHeader}/>

        {/* Tab Navigation Rail */}
        <div className="bg-[#111111] border-b border-[#2A2A2A] px-6 py-3 flex items-center space-x-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <TabItem active={activeTab === 'users'}   onClick={() => {setActiveTab('users');   setAppHeader('security/user')}} icon={<Users size={16} />}        label="Identity" />
          <TabItem active={activeTab === 'apps'}    onClick={() => {setActiveTab('apps');    setAppHeader('security/apps')}} icon={<Apple size={16} />}        label="Application" />
          <TabItem active={activeTab === 'process'} onClick={() => {setActiveTab('process'); setAppHeader('security/proc')}} icon={<TerminalIcon size={16} />} label="Process" />
          <TabItem active={activeTab === 'network'} onClick={() => {setActiveTab('network'); setAppHeader('security/nets')}} icon={<Wifi size={16} />}         label="Network Log" />
          <TabItem active={activeTab === 'file'}    onClick={() => {setActiveTab('file');    setAppHeader('security/file')}} icon={<FileText size={16} />}     label="File Log" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0A0A0A] relative">
          <div className="scanline opacity-20" />
          <AnimatePresence mode="wait">
            {/* IDENTITY TABLE */}
            {activeTab === 'users' && (
              <motion.div key="users" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <DashboardCard title="USER LIST">
                  <Table>
                    <THead columns={['ID', 'Username', 'Role', 'Password', 'Created at']} />
                    <tbody className="divide-y divide-white/5">
                      {mockData.users.map(user => (
                        <tr key={user.user_id} className="hover:bg-white/5 transition-colors group font-mono">
                          <td className="py-3 px-4 text-base text-white">{user.user_id}</td>
                          <td className="py-3 px-0 font-bold text-[#99f6e4]">{user.username}</td>
                          <td className="py-3 px-0">
                            <span className={`text-base font-bold uppercase px-2 py-0.5 rounded border ${user.role === 'admin' ? 'text-[#f43f5e] border-[#dc2626] bg-red-500/5' : 'text-green-500 border-green-500/20 bg-green-500/5'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-0">
                            <div className="flex items-center space-x-2 text-[#bfdbfe]">{user.hash}</div>
                          </td>
                          <td className="py-3 px-5 text-base text-gray-500">{user.created_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </DashboardCard>
              </motion.div>
            )}

            {/* APPLICATIONS TABLE */}
            {activeTab === 'apps' && (
              <motion.div key="apps" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <DashboardCard title="Software Inventory">
                  <Table>
                    <THead columns={['APP ID', 'AGENT ID', 'NAME', 'VERSION']} />
                    <tbody className="divide-y divide-white/5">
                      {mockData.applications.map(app => (
                        <tr key={app.app_id} className="hover:bg-white/5 transition-colors text-base font-mono">
                          <td className="py-3 px-4 text-white-500">{app.app_id}</td>
                          <td className="py-3 text-[#14b8a6]">{app.agent_id}</td>
                          <td className="py-3 font-bold">{app.software_name}</td>
                          <td className="py-3 px-6 text-gray-400">{app.version}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </DashboardCard>
              </motion.div>
            )}

            {/* PROCESS LOGS */}
            {activeTab === 'process' && (
              <motion.div key="process" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <DashboardCard title="Process Sentinel Log">
                  <Table>
                    <THead columns={['PID', 'Agent id', 'Process', 'User', 'Status', 'Command', 'Created at']} />
                    <tbody className="divide-y divide-white/5 text-base">
                      {mockData.process_logs.map(log => (
                        <tr key={log.pid} className="hover:bg-white/5 transition-colors font-mono">
                          <td className="py-3 px-4 text-white-500 font-bold">{log.pid}</td>
                          <td className="py-3 text-[#14b8a6]">{log.agent_id}</td>
                          <td className="py-3 text-[#60a5fa] uppercase font-bold">{log.process_name}</td>
                          {log.user !== "user" && <td className="py-3 text-[#ef4444] uppercase font-bold">{log.user}</td>}
                          {log.user === "user" && <td className="py-3 text-[#ddd6fe] uppercase font-bold">{log.user}</td>}
                          <td className="py-3 text-[#34d399] uppercase">{log.status}</td>
                          <td className="py-3 text-[#bfdbfe]">{log.cmd_line}</td>
                          <td className="py-3 px-5 text-gray-600 truncate">{log.created_at || '???'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </DashboardCard>
              </motion.div>
            )}

            {/* NETWORK LOGS */}
            {activeTab === 'network' && (
              <motion.div key="network" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <DashboardCard title="Real-time Network Telemetry">
                  <Table>
                    <THead columns={['PID', 'Agent id', 'Src Ip', 'Dest Ip', 'Dest Port', 'Protocol', 'Cnt', 'Created at']} />
                    <tbody className="divide-y divide-white/5">
                      {mockData.network_logs.map((log, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors text-base font-mono">
                          <td className="py-3 px-4 text-white-600 font-bold">{log.pid}</td>
                          <td className="py-3 text-[#14b8a6]">{log.agent_id}</td>
                          <td className="py-3 text-[#f43f5e]">{log.src_ip}</td>
                          <td className="py-3 text-[#fde047]">{log.dest_ip}</td>
                          <td className="py-3 text-[#ec4899] uppercase">{log.dest_port}</td>
                          <td className="py-3 text-[#60a5fa] uppercase">{log.protocol}</td>
                          <td className="py-3 text-white-500 uppercase">{log.connection_cnt}</td>
                          <td className="py-3 px-5 text-gray-500 uppercase">{log.created_at || '???'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </DashboardCard>
              </motion.div>
            )}

            {/* FILE LOGS */}
            {activeTab === 'file' && (
              <motion.div key="file" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <DashboardCard title="File Integrity Monitoring">
                  <Table>
                    <THead columns={['Agent id', 'File Path', 'Change Type', 'Old hash', 'New hash', 'Privilege', 'Created at']} />
                    <tbody className="divide-y divide-white/5">
                      {mockData.file_logs.map((log, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors group text-base font-mono">
                          <td className="py-3 px-4 text-[#14b8a6]">{log.agent_id}</td>
                          <td className="py-3 text-gray-300 truncate max-w-xs">{log.file_path}</td>
                          <td className="py-3">
                            <span className={`font-bold uppercase px-1.5 py-0.5 rounded 
                              ${log.change_type === 'Modified' ? 'text-yellow-500 bg-orange-500/5' : (log.change_type === 'Deleted')?
                                  'text-red-500 bg-red-500/5' : 'text-green-500 bg-green-500/5'}`}>
                              {log.change_type}
                            </span>
                          </td>
                          <td className="py-3 text-white-500">{log.old_hash || "•••••••"}</td>
                          <td className="py-3 text-white-600">{log.new_hash || "•••••••"}</td>
                          <td className="py-3 text-[#e11d48]">{log.permission}</td>
                          <td className="py-3 px-5 text-gray-600">{log.created_at || "???"}</td>
                          <td className="py-3 text-right">
                            <Link 
                                href={`/log?id=${i}`}
                                className="hover:cursor-pointer bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white px-2 py-1 rounded text-sm font-bold uppercase flex items-center space-x-1 ml-auto border border-blue-500/20 transition-all active:scale-95"
                              >
                                <ExternalLink size={14} />
                                <span>Detail</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </DashboardCard>
              </motion.div>
            )}
          </AnimatePresence>
          {/* ALERT CARD AT THE BOTTOM */}
          <AlertCard/>
        </div>
      </main>
    </div>
  );
}

