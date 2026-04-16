'use client';

import React, { useState } from 'react';
import { LucideSearch, LucideLoader2 } from 'lucide-react';

const ORGANS = [
  "Heart", "Lung", "Kidney", "Liver", "Pancreas", "Cornea", 
  "Bone Marrow", "Skin", "Plasma", "Platelet"
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface Props {
  onSearch: (organs: string[], bloodType: string) => void;
  isLoading: boolean;
}

export default function MatchRequestForm({ onSearch, isLoading }: Props) {
  const [selectedOrgans, setSelectedOrgans] = useState<string[]>([]);
  const [bloodType, setBloodType] = useState(BLOOD_TYPES[0]);

  const toggleOrgan = (organ: string) => {
    setSelectedOrgans(prev => 
      prev.includes(organ) ? prev.filter(o => o !== organ) : [...prev, organ]
    );
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-md">
      <h2 className="text-xl font-semibold mb-6 text-white">New Match Request</h2>
      
      <div className="space-y-6">
        {/* Organ Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-3">Required Organs / Components</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ORGANS.map(organ => (
              <button
                key={organ}
                onClick={() => toggleOrgan(organ)}
                className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                  selectedOrgans.includes(organ)
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-600'
                }`}
              >
                {organ}
              </button>
            ))}
          </div>
        </div>

        {/* Blood Type Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-3">Patient Blood Type</label>
          <select
            value={bloodType}
            onChange={(e) => setBloodType(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {BLOOD_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <button
          disabled={isLoading || selectedOrgans.length === 0}
          onClick={() => onSearch(selectedOrgans, bloodType)}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
        >
          {isLoading ? <LucideLoader2 className="w-5 h-5 animate-spin" /> : <LucideSearch className="w-5 h-5" />}
          Find Best Matches
        </button>
      </div>
    </div>
  );
}
