'use client';

import React from 'react';
import { LucideAward, LucideMapPin, LucideShieldAlert, LucideExternalLink } from 'lucide-react';

interface Props {
  match: any;
  rank: number;
}

export default function DonorMatchCard({ match, rank }: Props) {
  const getScoreColor = (score: number) => {
    if (score < 0.5) return 'bg-red-500';
    if (score < 0.75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getScoreTextColor = (score: number) => {
    if (score < 0.5) return 'text-red-400';
    if (score < 0.75) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all hover:shadow-xl hover:shadow-black/50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
              #{rank}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white pr-2">{match.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {match.blood_type}
                </span>
                <span className="text-xs flex items-center gap-1 text-slate-500">
                  <LucideMapPin className="w-3 h-3" /> {match.distance_km.toFixed(1)} km
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-black ${getScoreTextColor(match.ai_score)}`}>
              {(match.ai_score * 100).toFixed(0)}%
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">AI Match Score</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${getScoreColor(match.ai_score)}`}
            style={{ width: `${match.ai_score * 100}%` }}
          />
        </div>

        {/* Score Breakdown Bars */}
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(match.score_breakdown).map(([key, val]: [string, any]) => (
            <div key={key} title={key.replace('_', ' ')}>
              <div className="h-1 w-full bg-slate-800 rounded-full mb-1">
                <div 
                  className="h-full bg-blue-500 opacity-70"
                  style={{ width: `${val * 100}%` }}
                />
              </div>
              <div className="text-[8px] text-slate-600 truncate uppercase">{key.replace('factor', '').replace('_', ' ')}</div>
            </div>
          ))}
        </div>

        {/* AI Explanation Block (Only top ranks usually) */}
        {match.ai_explanation && (
          <div className="bg-blue-600/5 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <LucideShieldAlert className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">⚠ AI Advisory — Not a clinical decision</span>
            </div>
            <p className="text-sm text-slate-300 italic leading-relaxed">
              "{match.ai_explanation}"
              {match.explanation_source === 'fallback' && (
                <span className="block mt-2 text-[10px] text-slate-500">(Explanation service unavailable)</span>
              )}
            </p>
          </div>
        )}

        <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all">
          <LucideExternalLink className="w-3 h-3" />
          View Full Profile
        </button>
      </div>
    </div>
  );
}
