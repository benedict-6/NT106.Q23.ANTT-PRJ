import { DashboardCard } from '../helper/renderUI.js';
import { AlertTriangle } from 'lucide-react';
import { mockData } from '../helper/constant.js';
import { cleanThreat } from '../core/purgeThreat.js';

const { warning } = mockData;

export const AlertCard = () => {
  return (
    <DashboardCard title="Security Alerts" className="col-span-1 md:col-span-4 h-fit">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 overflow-y-auto pr-1">

        {warning.map((e, idx) => (
          <div
            key={idx}
            className="flex gap-3 p-3 rounded-lg border border-red-500/10 bg-gradient-to-r from-red-500/5 to-transparent hover:border-red-500/40 hover:bg-red-500/10 transition-all duration-200 items-center justify-center">
            <div className='flex flex-col items-center gap-y-2'>
                <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500 animate-pulse" />
                    <span className="text-xs font-semibold text-red-400 uppercase">{e.priority_level}</span>
                </div>
                <button className='hover:cursor-pointer text-xs bg-red-500 hover:bg-red-400 text-black font-semibold py-1 px-4 border-b-4 border-red-700 hover:border-red-500 rounded'
                    onClick={cleanThreat}>Purge</button>
            </div>
            <div className="flex-1 space-y-1 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-mono text-[#fde047]">Violate: Rule #{e.rule_id}</span>
              </div>
              <p className="text-xs text-gray-300 leading-snug">{e.description}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                <span>Type: <span className="text-gray-300">{e.target_type}</span></span>
                <span>Value: <span className="text-gray-300">{e.target_value}</span></span>
                <span>By: <span className="text-gray-300">{e.created_by}</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
};