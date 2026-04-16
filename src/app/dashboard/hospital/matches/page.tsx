'use client';

import React from 'react';
import MatchRequestForm from '@/components/matching/MatchRequestForm';
import DonorMatchCard from '@/components/matching/DonorMatchCard';
import FilterStatsBar from '@/components/matching/FilterStatsBar';
import EmptyMatchState from '@/components/matching/EmptyMatchState';
import { useMatchFinder } from '@/hooks/useMatchFinder';
import { LucideAlertCircle, LucideLoader2, LucideDna } from 'lucide-react';

// For demo/testing purposes
const DEFAULT_HOSPITAL_ID = "00000000-0000-0000-0000-000000000000"; 

export default function HospitalMatchesPage() {
  const { state, findMatches } = useMatchFinder();

  const handleSearch = (organs: string[], bloodType: string) => {
    // In a real app, hospital_id comes from Auth context
    findMatches(DEFAULT_HOSPITAL_ID, organs, bloodType);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <LucideDna className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Production AI Matching</h1>
            <p className="text-slate-500 font-medium">Life-Critical Donor-Hospital Synchronization Hub</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Sidebar / Form */}
          <div className="lg:col-span-4 lg:sticky lg:top-8 h-fit">
            <MatchRequestForm 
              onSearch={handleSearch} 
              isLoading={state.status === "loading"} 
            />
            
            <div className="mt-8 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <LucideAlertCircle className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black">Advisory Notice</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed italic">
                AI scores are generated from synthetic models. Final clinical verification 
                must be performed by a licensed medical professional.
              </p>
            </div>
          </div>

          {/* Main Results Area */}
          <div className="lg:col-span-8">
            {state.status === "idle" && (
              <div className="h-[400px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600">
                <LucideDna className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium">Define hospital requirements to start matching</p>
              </div>
            )}

            {state.status === "loading" && (
              <div className="space-y-6">
                <div className="animate-pulse bg-slate-900 h-20 rounded-xl" />
                <div className="grid grid-cols-1 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-slate-900 h-64 rounded-2xl border border-slate-800" />
                  ))}
                </div>
              </div>
            )}

            {state.status === "error" && (
              <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center">
                <h3 className="text-red-500 font-bold text-xl mb-4">Matching Failed</h3>
                <p className="text-slate-400 mb-0">{state.message}</p>
              </div>
            )}

            {state.status === "empty" && <EmptyMatchState stats={state.stats} />}

            {state.status === "success" && (
              <div className="space-y-0">
                <FilterStatsBar stats={state.data.filter_stats} />
                <div className="grid grid-cols-1 gap-6">
                  {state.data.matches.map((match: any, index: number) => (
                    <DonorMatchCard 
                      key={match.donor_id} 
                      match={match} 
                      rank={index + 1} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
