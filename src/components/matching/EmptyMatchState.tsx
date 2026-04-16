'use client';

import React from 'react';
import { LucideShieldX, LucideInfo } from 'lucide-react';

interface Props {
  stats: any;
}

export default function EmptyMatchState({ stats }: Props) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center max-w-2xl mx-auto">
      <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <LucideShieldX className="w-10 h-10 text-amber-500" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-4">No Compatible Donors Found</h3>
      <p className="text-slate-400 mb-8 leading-relaxed">
        The matching engine screened all available donors but none passed the mandatory clinical 
        compatibility filters for this specific request. Review the breakdown below for clinical auditing.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="text-red-400 font-black text-xl mb-1">{stats?.failed_blood_type}</div>
          <div className="text-[10px] uppercase text-slate-500 font-bold">Incompatible ABO/Rh</div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="text-red-400 font-black text-xl mb-1">{stats?.failed_age_window}</div>
          <div className="text-[10px] uppercase text-slate-500 font-bold">Outside Age Window</div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="text-red-400 font-black text-xl mb-1">{stats?.failed_condition}</div>
          <div className="text-[10px] uppercase text-slate-500 font-bold">Medical Blockers</div>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-slate-800 flex items-center justify-center gap-2 text-slate-500">
        <LucideInfo className="w-4 h-4" />
        <span className="text-xs italic">Ensure hospital requirements are correctly defined.</span>
      </div>
    </div>
  );
}
