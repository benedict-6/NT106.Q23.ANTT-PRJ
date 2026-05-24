'use client';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Terminal, ArrowRight, AlertTriangle } from 'lucide-react';
import { RobotFramework, BattleDotNet, KeyCDN, Github, Discord } from '../../helper/icons.jsx';

import { HackerButton, RenderUIPattern } from '../../helper/renderUI.js';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        if(errorMsg){
            const death = setTimeout(() => {
                setErrorMsg('');
            }, 10 * 1000); // error notification will disappear after 10s
            return () => clearTimeout(death);
        }
    }, [errorMsg]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        setIsLoading(true);

        try {
            console.log("[1] Bắt đầu gửi dữ liệu Đăng nhập...");

            const response = await fetch(`${process.env.NEXT_PUBLIC_MASTER_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_email: email,
                    password: password
                }),
            });

            console.log("[2] Server đã phản hồi! Trạng thái HTTP:", response.status);

            const data = await response.json();
            console.log("[3] Dữ liệu Server trả về:", data);

            if (response.ok) {
                if (!data.token) {
                    setErrorMsg('Lỗi: Server báo thành công nhưng không đưa Token!');
                    return;
                }

                localStorage.setItem('token', data.token);
                try {
                    const base64Url = data.token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const payload = JSON.parse(atob(base64));
                    console.log("[4] Giải mã Token thành công:", payload);

                    const role = payload._role || payload.role;
                    setSuccessMsg('Welcome sir/madam');
                    setTimeout(() => {
                        if (role === 'admin') {
                            router.push('/admin');
                        } else {
                            router.push('/');
                        }
                    }, 1000);
                
                } catch (decodeError) {
                    console.error("Lỗi giải mã token:", decodeError);
                    router.push('/login');
                }
            } else {
                setErrorMsg(data.message || 'Đăng nhập thất bại!');
                console.error(`[Login] Failed! Status Code: ${response.status}`, data.message);
            }
        } catch (error) {
            console.error("Lỗi mạng (Network Error):", error);
            setErrorMsg('Không thể kết nối đến máy chủ. (Server có đang bật không?)');
        } finally {
            setIsLoading(false);
            console.log("[5] Hoàn tất vòng lặp!");
        }
     };

    return (
        <div className="min-h-screen hacker-bg flex flex-col items-center justify-center p-4 relative overflow-hidden font-mono">
            <div className="scanline" />

            <RenderUIPattern />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-[440px] z-10"
            >
                <div className="mb-8 border-l-4 border-blue-500 pl-6">
                    <div className="flex items-center space-x-3 mb-2">
                        <Terminal className="text-blue-500 animate-pulse" size={24} />
                        <span className="text-blue-500 font-bold tracking-tighter text-3xl glow-text">SYSTEM LOGIN</span>
                    </div>
                    <div className="text-gray-500 text-base hover:text-[#60a5fa]">
                        STATUS: <span className="text-blue-500/70 hover:text-[#1d4ed8]">REQUIRE TO CONTINUE</span>
                    </div>
                </div>

                <div className="bg-black/80 backdrop-blur-md border border-blue-500/20 rounded-none p-8 glow-border relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500/50" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500/50" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500/50" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500/50" />

                    <form className="space-y-4" onSubmit={handleLogin}>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[17px] tracking-tight font-bold text-blue-500">USERMAIL</label>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-500/30 group-focus-within:text-blue-500 transition-colors">
                                    <RobotFramework />
                                </div>
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    type="text"
                                    placeholder="IDENTIFY WHO YOU ARE"
                                    autoComplete="off"
                                    spellCheck="false"
                                    className="w-full bg-black border border-blue-500/30 rounded-none py-3.5 pl-13 pr-4 text-blue-400 placeholder:text-[#808080] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all text-base"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[17px] uppercase tracking-tight font-bold text-blue-500">SECRET</label>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-500/30 group-focus-within:text-blue-500 transition-colors">
                                    <KeyCDN />
                                </div>
                                <input
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    type="password"
                                    placeholder="PROVE WHO YOU ARE"
                                    autoComplete="new-password"
                                    spellCheck="false"
                                    className="w-full bg-black border border-blue-500/30 rounded-none py-3.5 pl-13 pr-4 text-blue-400 placeholder:text-[#808080] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all text-base"
                                />
                            </div>
                            <div className="text-right">
                                <Link href="#" className="text-[12px] font-bold text-gray-600 hover:text-blue-500 transition-colors">FORGET SOMETHING?</Link>
                            </div>
                        </div>

                        {errorMsg && (
                            <motion.div 
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.3 }}
                                className="p-3 bg-red-950/30 border border-red-500/40 text-red-400 text-xs tracking-wider uppercase flex items-start space-x-2 animate-pulse"
                            >
                                <div className='flex flex-row items-center gap-x-3'>
                                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                    {<span className="font-bold text-red-500">ACCESS_DENIED: {errorMsg}</span>}
                                </div>
                            </motion.div>
                        )}
                        
                        {successMsg && (
                            <motion.div 
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.3 }}
                                className="p-3 bg-green-950/30 border border-green-500/40 text-green-400 text-xs tracking-wider uppercase flex items-start space-x-2"
                            >
                                <span className="text-green-500 animate-ping shrink-0 mt-1">●</span>
                                <div>
                                    <span className="font-bold text-green-500">ACCESS_GRANTED: </span>
                                    {successMsg}
                                </div>
                            </motion.div>
                        )}

                        <button disabled={isLoading} type="submit" className="w-full bg-blue-900/20 border-2 border-blue-500 hover:bg-blue-500 hover:text-white text-blue-500 font-bold py-3 rounded-none flex items-center justify-center space-x-3 transition-all active:scale-[0.98] mt-2 group">
                            <span className="tracking-[0.3em]">HACK</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="relative my-3">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-blue-500/40"></div>
                        </div>
                        <div className="relative flex justify-center text-[12px] font-bold text-[#C0C0C0] tracking-widest">
                            <span className="bg-[#000000] px-4">SIGN UP WITH IdP</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <HackerButton icon={<Github />} label="GitHub" />
                        <HackerButton icon={<Discord />} label="Discord" />
                    </div>
                </div>

                <div className="mt-3 flex flex-col items-center space-y-4">
                    <p className="text-base text-gray-600 tracking-wider">
                        FIRST-TIMER ?{' '}
                        <Link href={"/register"}><button className="text-blue-600 font-bold hover:text-blue-400 hover:underline cursor-pointer bg-transparent">JOIN OUR FORCES</button></Link>
                    </p>
                    <Link href={"/"}>
                        <button className="inline-flex items-center space-x-2 text-[12px] text-blue-500/40 hover:text-blue-500 transition-colors border border-blue-500/20 px-3 py-1.5 rounded-full uppercase tracking-tighter">
                            <BattleDotNet />
                            <span>demo bypass_auth</span>
                        </button>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}

