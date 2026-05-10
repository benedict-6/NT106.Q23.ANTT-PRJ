import { Menu, ChevronRight, HelpCircle, ArrowBigDownDash } from "lucide-react"
import { findTitle } from "../helper/support.js"
import Link from "next/link.js";

export const AppHeader = ({route}) => {
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
                <button className="text-gray-400 hover:text-white transition-colors">Follow</button>
                <button className="text-gray-400 hover:text-white transition-colors">Share</button>
                <button className="text-gray-400 hover:text-white transition-colors">Guide</button>
                <button className="text-gray-400 hover:text-white transition-colors">Feedback</button>
                <button className="text-blue-400 hover:text-blue-300 transition-colors">Save</button>
                <button className="bg-[#ED2939] hover:bg-[#FF3800] text-white px-4 py-1.5 rounded font-medium flex items-center space-x-2" 
                    ><Link href={"/start"}>Clean</Link></button>
                <button className="bg-[#1D4ED8] hover:bg-[#2563EB] text-white px-4 py-1.5 rounded font-medium flex items-center space-x-2">
                    <ArrowBigDownDash size={18} />
                    <span>Add agent</span>
                </button>
                <div className="flex items-center justify-center text-black font-bold text-sm mt-1">
                    <img src="https://tinyurl.com/5ybkwhep" className='w-10 h-10 rounded-full object-cover'></img>
                </div>
                <HelpCircle size={20} className="text-gray-400 mr-3" />
            </div>
        </header>
    )
}
