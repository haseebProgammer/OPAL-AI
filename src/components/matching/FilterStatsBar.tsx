'use client';

import React from 'react';
import { LucideCheckCircle2, LucideFilter, LucideTrendingUp } from 'lucide-react';

interface Props {
  stats: any;
}

export default function FilterStatsBar({ stats }: Props) {
  if (!stats) return null;

  return (
    <div className="flex flex-wrap items-center gap-6 py-4 px-6 bg-slate-900/30 border-b border-slate-800 backdrop-blur-sm rounded-xl mb-8">
      <div className="flex items-center gap-2">
        <LucideFilter className="w-4 h-4 text-slate-500" />
        <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Pipeline Status</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-lg font-black text-slate-400">{stats.total_donors_in_db}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Database</span>
        </div>
        <div className="w-8 h-px bg-slate-800" />
        <div className="flex flex-col">
          <span className="text-lg font-black text-amber-500">{stats.passed_compatibility}</span>
          <span className="text-[10px] text-amber-500 uppercase tracking-tighter">Compatible</span>
        </div>
        <div className="w-8 h-px bg-slate-800" />
        <div className="flex flex-col">
          <span className="text-lg font-black text-emerald-500">{stats.ranked_by_ai}</span>
          <span className="text-[10px] text-emerald-500 uppercase tracking-tighter">Ranked by AI</span>
        </div>
      </div>
    </div>
  );
}
