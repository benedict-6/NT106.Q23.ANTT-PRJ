'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, ArrowRight, ArrowLeft, Info, Fingerprint, PersonStanding, KeyRound, Sparkles, CircleAlert } from 'lucide-react';

import { CustomCheckbox } from '../helper/renderUI.js'

export const RegisterPage = ({ onSwitchToLogin }) => {
  const [step, setStep] = useState(1);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const totalSteps = 2;

  return (
    <div className="min-h-screen hacker-bg flex flex-col items-center justify-center p-4 relative overflow-hidden font-mono text-blue-500/90">
      {/* Dynamic Scanline & Grid */}
      <div className="scanline" />
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      {/* Background Data Streams */}
      <div className="absolute top-10 right-10 text-blue-500/10 text-[9px] select-none pointer-events-none text-right hidden lg:block leading-relaxed">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="hover:text-blue-500/40 transition-colors uppercase">
            {`>> [${new Date().toISOString().split('T')[1].split('.')[0]}] NET_TRACE: #00${i} -- ADDR_0x${Math.random().toString(16).slice(2, 6)} -- OK`}
          </div>
        ))}
      </div>

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
                  <InputField label="F1RST N4M3" placeholder="" icon={<PersonStanding size={25} />} />
                  <InputField label="L4ST N4M3" placeholder="" />
                </div>

                <InputField label="SCH00L" placeholder=""/>
                <InputField label="9M41L" type="email"/>

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

                <InputField label="P4SSW0RD" placeholder="" icon={<KeyRound size={20} />} type="password" />
                <InputField label="C0NF1RM P4SSW0RD" placeholder="" icon={<RotateCcw size={20} />} type="password" />

                <div className="bg-blue-500/5 border border-blue-500/10 p-2 rounded-sm">
                  <div className="flex flex-col space-x-3">
                    <div className='flex flex-start'>
                      <p className="flex flex-row items-center justify-center text-[15px] uppercase font-bold text-red-400 mb-1 gap-x-1">
                        <CircleAlert size={16} className="text-red-500 mt-1 flex-shrink-0" />P0l1cy
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 leading-relaxed uppercase ml-[20px]">
                          Passwords must be at least 12 characters long and include a combination of uppercase letters, 
                          lowercase letters, numbers, and special characters.
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
                  
                  <button type="submit" className="font-mono text-xl flex-1 bg-blue-600 border border-blue-400 hover:bg-blue-500 text-white font-bold py-2 flex items-center justify-center space-x-4 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all uppercase tracking-normal relative overflow-hidden group">
                    <span className="relative z-10">G3T ST4RT3D N0W</span>
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
              onClick={onSwitchToLogin}
              className="text-[13px] font-bold text-gray-600 tracking-[0.25em] hover:text-blue-400 transition-colors uppercase border-b border-transparent hover:border-blue-400/30 pb-1 cursor-pointer bg-transparent"
            >
              ALREADY HAVE AN ACCOUNT
            </button>
            <div className='flex flex-row items-center justify-center gap-x-2'>
              <Sparkles size={20} color='gray'/>
              <Link href="/" className="text-[13px] font-bold text-gray-600 tracking-[0.25em] hover:text-blue-400 transition-colors uppercase border-b border-transparent hover:border-blue-400/30 pb-1">
                GUIDE
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const InputField = ({ label, placeholder, icon, type = "text" }) => {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between">
        <label className="font-extrabold text-[18px] uppercase tracking-tight text-blue-500 group-focus-within:text-blue-400 transition-colors leading-none">
          {label}
        </label>
      </div>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-500/20 group-focus-within:text-blue-500 transition-colors">
            {icon}
          </div>
        )}
        <input 
          type={type} 
          placeholder={placeholder}
          className={`w-full bg-black/50 border border-blue-500/40 hover:border-blue-500/40 focus:border-blue-500 focus:bg-blue-500/5 transition-all text-sm py-3.5 ${icon ? 'pl-11' : 'px-4'} pr-4 text-blue-100 placeholder:text-blue-900/30 focus:outline-none focus:ring-1 focus:ring-blue-500/10 rounded-none`}
          required
          autoComplete='off'
          maxLength={21}
        />
        {/* Bottom animated bar */}
        <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-blue-500 group-focus-within:w-full transition-all duration-500" />
      </div>
    </div>
  );
}

const CornerBrackets = () => {
  return (
    <>
      <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-blue-500 pointer-events-none opacity-40" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-blue-500 pointer-events-none opacity-40" />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-blue-500 pointer-events-none opacity-40" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-blue-500 pointer-events-none opacity-40" />
      {/* Decorative dots */}
      <div className="absolute top-2 left-2 w-1 h-1 bg-blue-500/30 rounded-full" />
      <div className="absolute top-2 right-2 w-1 h-1 bg-blue-500/30 rounded-full" />
      <div className="absolute bottom-2 left-2 w-1 h-1 bg-blue-500/30 rounded-full" />
      <div className="absolute bottom-2 right-2 w-1 h-1 bg-blue-500/30 rounded-full" />
    </>
  );
}

