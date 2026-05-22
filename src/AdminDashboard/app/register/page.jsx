'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Fingerprint, CircleAlert } from 'lucide-react';

import { Odysee, School, Gmail, KeeWeb, Again, Guide } from '../../helper/icons.jsx';

import { CustomCheckbox, CornerBrackets, InputField, RenderUIPattern } from '../../helper/renderUI.js'
import { useNavigation } from '../../hooks/useNavigation.js';

const RegisterPage = () => {
  // const route = useRouter();
  const [step, setStep] = useState(1);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [school, setSchool] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { handlePowerOff } = useNavigation();
  const isSubmittingRef = useRef(false);

  // XỬ LÝ GỌI API ĐĂNG KÝ
  const handleRegister = async (e) => {
    e.preventDefault();

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg("MẬT KHẨU XÁC NHẬN KHÔNG KHỚP!");
      return;
    }
    if (!agreeTerms) {
      setErrorMsg("BẠN PHẢI ĐỒNG Ý VỚI ĐIỀU KHOẢN HỆ THỐNG!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_MASTER_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Dữ liệu gửi đi: Map đúng tên biến mà API Backend yêu cầu
        body: JSON.stringify({
          user_email: email,
          password: password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // alert("ĐĂNG KÝ THÀNH CÔNG! HÃY ĐĂNG NHẬP VỚI TÀI KHOẢN VỪA TẠO.");
        handlePowerOff(); // Về login
      } else {
        setErrorMsg(data.message || 'ĐĂNG KÝ THẤT BẠI!');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('KHÔNG THỂ KẾT NỐI ĐẾN MÁY CHỦ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen hacker-bg flex flex-col items-center justify-center p-4 relative overflow-hidden font-mono text-blue-500/90">
      {/* Dynamic Scanline & Grid */}
      <div className="scanline" />
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <RenderUIPattern/>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[560px] z-10"
      >
        {/* Progress System */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center space-x-2">
            <Fingerprint className="text-blue-500 animate-pulse" size={30} />
            <span className="text-blue-400 font-bold tracking-tight text-xl glow-text uppercase">SEC_RITY is not complete without U!</span>
          </div>
          <div className="flex space-x-1">
            {[1, 2].map((i) => (
              <div 
                key={i} 
                className={`h-1 w-8 rounded-full transition-all duration-500 ${step >= i ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-gray-800'}`}
              />
            ))}
          </div>
        </div>

        {/* Main Interface */}
        <div className="bg-black/95 backdrop-blur-xl border border-blue-500/20 rounded-none p-4 sm:p-8 glow-border relative overflow-hidden ring-1 ring-blue-500/10">
          {/* Animated Matrix Accents */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full" />

          <CornerBrackets />

          {/* KHUNG HIỂN THỊ LỖI */}
          {errorMsg && (
            <div className="relative z-20 mb-4 p-2 bg-red-500/10 border border-red-500/50 text-red-500 text-center font-bold text-sm uppercase animate-pulse">
              [!] {errorMsg}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6 relative z-10"
              >
                <div className="border-b border-blue-500/10 pb-4 mb-3">
                  <h2 className="text-xl font-bold text-white tracking-tighter flex items-center">
                    US3R 1NF0
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-base font-mono">
                  <InputField label="F1RST N4M3" placeholder="" value={firstName} onChange={(e) => setFirstName(e.target.value)} icon={<Odysee />} />
                  <InputField label="L4ST N4M3" placeholder="" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>

                <InputField label="SCH00L" placeholder="" value={school} onChange={(e) => setSchool(e.target.value)} icon={<School />} />
                <InputField label="9M41L" type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Gmail />} />

                <div className='flex justify-end'>
                  <button 
                    onClick={() => setStep(2)}
                    type="button"
                    className="bg-blue-900/10 border-2 border-blue-500/50 hover:border-blue-400 hover:bg-blue-500 hover:text-white text-blue-400 font-bold px-3 py-2 rounded-3xl transition-all flex items-center justify-center space-x-2 group"
                  >
                    <span className="tracking-tighter">NEXT</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 relative z-10"
              >
                <div className="border-b border-blue-500/10 pb-4 mb-3">
                  <h2 className="text-xl font-bold text-white tracking-tighter flex items-center">
                    S3CUR3 Y0UR 4CC0UNT
                  </h2>
                </div>

                <InputField label="P4SSW0RD" placeholder="" value={password} onChange={(e) => setPassword(e.target.value)} icon={<KeeWeb />} type="password" />
                <InputField label="C0NF1RM P4SSW0RD" placeholder="" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} icon={<Again />} type="password" />

                <div className="bg-blue-500/5 border border-blue-500/10 p-2 rounded-sm">
                  <div className="flex flex-col space-x-3">
                    <div className='flex flex-start'>
                      <p className="flex flex-row items-center justify-center text-[15px] uppercase font-bold text-red-400 mb-1 gap-x-1">
                        <CircleAlert size={16} className="text-red-500 mt-1 flex-shrink-0" />P0l1cy
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 leading-relaxed uppercase ml-[20px]">
                          Passwords must be at least 12 to 28 characters long.  
                          Include a combination of letters, numbers, and special characters.
                      </p>
                    </div>
                  </div>
                </div>

                <CustomCheckbox 
                  checked={agreeTerms}
                  onChange={setAgreeTerms}
                  label="I acknowledge the"
                  linkText="application terms"
                  endText="and privacy data management policy."
                />

                <div className="flex flex-col sm:flex-row space-y-0 sm:space-y-0 sm:space-x-31">
                  <button 
                    onClick={() => setStep(1)}
                    type="button"
                    className="bg-blue-900/10 border-2 border-blue-500/50 hover:border-blue-400 hover:bg-blue-500 hover:text-white text-blue-400 font-bold px-3 rounded-full transition-all flex items-center justify-center space-x-2 group"
                  >
                    <ArrowLeft size={20} className="group-hover:translate-x-1 transition-transform" />
                    <span className="tracking-tighter">BACK</span>
                  </button>

                  {/* Hàm xử lý Đăng ký vào Nút Submit */}
                  <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    type="button"
                    className={`font-mono text-xl flex-1 border border-blue-400 font-bold py-2 flex items-center justify-center space-x-4 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all uppercase tracking-normal relative overflow-hidden group ${isLoading ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]'}`}
                  >
                    <span className="relative z-10">{isLoading ? "PR0C3SS1NG..." : "G3T ST4RT3D N0W"}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="mt-3 flex flex-col items-center">
          <div className="flex items-center justify-center space-x-6">
            <button 
              onClick={handlePowerOff}
              className="text-[13px] font-bold text-gray-600 tracking-[0.25em] hover:text-blue-400 transition-colors uppercase border-b border-transparent hover:border-blue-400/30 pb-1 cursor-pointer bg-transparent"
            >
              ALREADY HAVE AN ACCOUNT
            </button>
            <div className='flex flex-row items-center justify-center gap-x-2'>
              <Guide />
              <Link href="/guide" className="text-[13px] font-bold text-gray-600 tracking-[0.25em] hover:text-blue-400 transition-colors uppercase border-b border-transparent hover:border-blue-400/30 pb-1">
                GUIDE
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default RegisterPage;




