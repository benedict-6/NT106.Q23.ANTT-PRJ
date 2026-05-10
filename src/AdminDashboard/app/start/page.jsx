import React from "react";
import { SideBar } from "../../components/sidebar.jsx";
import { AppHeader } from "../../components/header.jsx";

export default function NoContentPage(){
  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A] text-[#E0E0E0] font-sans">
      <SideBar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <AppHeader route={'blank'} />
     
        <div className="flex-1 relative overflow-y-auto flex items-center justify-center p-6">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/10 blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-purple-600/10 blur-[100px]" />
          </div>
          <div className="relative w-full max-w-5xl z-10">
            <div className="grid items-center gap-12 lg:grid-cols-2">          
              <div className="font-inter flex flex-col items-center text-center lg:items-start lg:text-left order-2 lg:order-1">
                <h1 className="flex flex-col text-5xl font-black tracking-tight uppercase space-y-2 lg:space-y-4">
                  <span className="text-7xl lg:text-8xl bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Oooops!
                  </span>
                  <span className="text-gray-100">Nothing here</span>
                </h1>
                <p className="mt-6 max-w-md text-lg text-gray-400">
                    This robot feels so lonely. Install an agent to make friend with it.
                </p>
              </div>
              <div className="flex justify-center lg:justify-end order-1 lg:order-2">
                <div className="relative">
                  <div className="absolute inset-0 -z-10 translate-y-6 scale-95 rounded-[3rem] bg-blue-500/20 blur-2xl" />
                  <div className="rounded-[2.25rem] border border-white/10 bg-[#121212]/60 p-8 shadow-2xl backdrop-blur-xl">
                    <img
                      src="/img/startPageImg.png"
                      alt="Empty state illustration"
                      className="h-auto w-[280px] max-w-full select-none object-contain md:w-[380px] drop-shadow-lg transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}