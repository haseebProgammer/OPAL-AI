"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Activity, 
  MapPin, 
  Users, 
  Clock, 
  Filter, 
  Search, 
  Info,
  CheckCircle2,
  AlertCircle,
  Phone,
  Droplets,
  HeartPulse,
  ShieldCheck,
  ChevronRight,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BLOOD_TYPES, ORGAN_TYPES, URGENCY_LEVELS } from "@/lib/constants";
import { formatDistance } from "@/lib/utils";
import { ProcureModal } from "@/components/dashboard/hospital/ProcureModal";
import { toast } from "sonner";

// --- Medical Grade Theme Constants ---
const COLORS = {
  background: "bg-slate-50",
  card: "bg-white",
  textPrimary: "text-slate-800",
  textSecondary: "text-slate-500",
  actionBlue: "bg-blue-600 hover:bg-blue-700",
  border: "border-slate-200",
};

// --- Sub-components ---

const MetricBadge = ({ label, value, icon: Icon, color = "text-slate-700" }: { label: string; value: string; icon: any, color?: string }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
      <Icon className="h-2.5 w-2.5" /> {label}
    </span>
    <span className={`text-sm font-semibold ${color}`}>{value}</span>
  </div>
);

const MatchCard = ({ match, isTopMatch = false, onProcure, category }: { match: any, isTopMatch?: boolean, onProcure: (m: any) => void, category: string }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const score = Math.round(match.ai_score * 100);
  const scoreColor = score >= 80 ? "bg-green-100 text-green-700" : score >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";

  // OSRM & CIT Checks
  const isOSRM = match.routing_source === "OSRM";
  const citPercent = match.score_breakdown?.cit_viability ? Math.round((1 - match.score_breakdown.cit_viability) * 100) : 0;
  
  const getCITColor = (pct: number) => {
    if (pct < 30) return "bg-green-500";
    if (pct < 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleRevealContact = async () => {
    if (!showPhone) {
      const logId = await logContactReveal(match.donor_id);
      if (logId) {
        toast.info(`Access logged for medical audit. ID: #AUDIT-${logId}`, {
          icon: <ShieldCheck className="h-4 w-4 text-primary" />,
          duration: 4000
        });
      }
      setShowPhone(true);
    } else {
      setShowPhone(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${COLORS.card} rounded-xl border ${isTopMatch ? 'border-blue-500 ring-4 ring-blue-500/10' : COLORS.border} overflow-hidden shadow-sm hover:shadow-md transition-all mb-4`}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-4">
            <div className={`h-12 w-12 rounded-lg ${isTopMatch ? 'bg-blue-600' : 'bg-slate-100'} flex items-center justify-center`}>
              {match.blood_type?.includes('O') ? <Droplets className={`h-6 w-6 ${isTopMatch ? 'text-white' : 'text-blue-600'}`} /> : <Activity className={`h-6 w-6 ${isTopMatch ? 'text-white' : 'text-blue-600'}`} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-lg">{match.name || match.donor_name}</h3>
                {isTopMatch && <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Primary Match Recommendation</span>}
                {isOSRM && <span className="bg-slate-800 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1"><MapPin className="w-2.5 h-2.5"/> OSRM Real Routing</span>}
              </div>
              <p className="text-xs text-slate-500 font-mono">ID: #{match.donor_id.substring(0, 8)}</p>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-black ${scoreColor} flex items-center gap-1.5`}>
            <Zap className="h-3 w-3" /> {score}% Match Confidence
          </div>
        </div>

        {/* CIT Viability Clock Visualizer */}
        {category === 'organ' && (
          <div className="mb-6 px-1">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transport Viability Window</p>
                <p className="text-xs font-bold text-slate-700">{match.travel_time_human || "N/A"} Travel Time</p>
              </div>
              <p className={`text-xs font-black ${citPercent > 80 ? 'text-red-600' : 'text-slate-500'}`}>
                {100 - citPercent}% Buffer Remaining
              </p>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${citPercent}%` }}
                className={`h-full ${getCITColor(citPercent)} transition-colors duration-1000`}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-4 border-y border-slate-50">
          <MetricBadge 
            label={category === 'blood' ? "Donation Type" : "Matched Organ"} 
            value={category === 'blood' ? "Whole Blood" : (match.organ_type || "Kidney")} 
            icon={category === 'blood' ? Droplets : Activity}
            color="text-slate-800 font-black" 
          />
          <MetricBadge label="ABO Alignment" value={match.blood_type} icon={Droplets} />
          <MetricBadge label={isOSRM ? "Real ETA" : "Est. Road Time"} value={match.travel_time_human || `${Math.round(match.distance_km/60)}h`} icon={Clock} />
          <MetricBadge label="Road Distance" value={`${match.distance_km?.toFixed(1) || '—'} km`} icon={MapPin} />
          <MetricBadge 
             label={category === 'blood' ? "Urgency" : "AI Priority"} 
             value={category === 'blood' ? "Routine" : (score > 90 ? "Critical Match" : "High Compatibility")} 
             icon={ShieldCheck} 
             color={"text-slate-800 font-black"}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
          >
            {showDetails ? "Hide Clinical Justification" : "View Clinical Justification"}
            <ChevronRight className={`h-3 w-3 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={handleRevealContact}
              className={`px-3 py-2 rounded-xl border ${showPhone ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition-colors flex items-center justify-center gap-2 min-w-[40px]`}
              title="Reveal Contact Number"
            >
              <Phone className="h-4 w-4" />
              {showPhone && <span className="text-xs font-bold tracking-wider">{match.phone || "+92 300 1234567"}</span>}
            </button>
            <button 
              onClick={() => onProcure(match)}
              className={`px-6 py-2 rounded-lg ${COLORS.actionBlue} text-white text-sm font-bold shadow-sm transition-all`}
            >
              Approve & Procure
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showDetails && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden"
            >
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    {match.ai_explanation || "Clinical verification in progress for this donor profile."}
                  </p>
                  {match.explanation_source === 'llm' && (
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Neural Model Justification
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// --- Main Page Component ---

function MatchingDashboardContent() {
  const searchParams = useSearchParams();
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  
  // 1. Centralized Filter State
  const [donorType, setDonorType] = useState<"blood" | "organ">((searchParams.get("mode") as any) || "organ");
  const [organFilter, setOrganFilter] = useState(searchParams.get("organType") || "Kidney");
  const [bloodFilter, setBloodFilter] = useState(searchParams.get("bloodType") || "O+");
  const [urgencyFilter, setUrgencyFilter] = useState(searchParams.get("urgency") || "Routine");
  const [searchRadius, setSearchRadius] = useState<number>(parseInt(searchParams.get("radius") || "50", 10));
  const [searchQuery, setSearchQuery] = useState("");
  
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStats, setFilterStats] = useState<any>(null);

  // 2. Production Fetch Logic (Remove Simulation)
  useEffect(() => {
    const fetchMatches = async () => {
      const urgencyMap: Record<string, string> = {
        "Routine": "low",
        "Urgent": "medium",
        "Emergency": "critical"
      };

      setIsLoading(true);
      setIsSimulationMode(false);
      
      try {
        const response = await fetch("/api/backend/api/match/find", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             hospital_id: "hosp-default", 
             required_organs: donorType === "organ" ? [organFilter] : [],
             patient_blood_type: bloodFilter,
             urgency_level: urgencyMap[urgencyFilter] || "medium",
             donor_type: donorType,
             max_results: 20
           })
        });

        if (!response.ok) throw new Error("Match Engine Service Unavailable");
        
        const data = await response.json();
        const radiusFiltered = (data.matches || []).filter((m: any) => m.distance_km <= searchRadius);
        setMatches(radiusFiltered);
        setFilterStats({
          ...data.filter_stats,
          passed_clinical_filters: radiusFiltered.length,
        });
        toast.success(`Production Engine: ${radiusFiltered.length} verified donors matched.`);
      } catch (error: any) {
        setMatches([]);
        setFilterStats(null);
        toast.error(`Clinical Engine Error: ${error.message}. Please contact system administrator.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [donorType, organFilter, bloodFilter, urgencyFilter, searchRadius]);

  const logContactReveal = async (donorId: string) => {
    try {
      const resp = await fetch('/api/privacy/log-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donor_id: donorId, action: 'reveal_contact' })
      });
      const data = await resp.json();
      return data.log_id;
    } catch (e) {
      console.error("Compliance Log Failed", e);
      return null;
    }
  };

  return (
    <div className={`min-h-screen ${COLORS.background} p-4 md:p-8 font-sans`}>
      <div className="max-w-7xl mx-auto">
        <AnimatePresence>
          {isSimulationMode && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start sm:items-center gap-4 shadow-sm"
            >
              <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900 mb-1">
                  Neural Simulation Engine / Backup Mode
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Live backend connection is establishing. The dashboard has safely fallen back to the Simulation Engine. 
                  Admin Location is defaulted to <span className="font-black bg-amber-100 px-1 rounded">Lahore / Central Hub</span>. 
                  Mocked donors have been dynamically generated within your requested <span className="font-black bg-amber-100 px-1 rounded">{searchRadius}km radius</span> to model real-world logistics reach.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-80 flex-shrink-0">
          <div className={`${COLORS.card} rounded-2xl border ${COLORS.border} p-6 sticky top-8 shadow-sm`}>
            <div className="flex items-center gap-2 mb-6">
              <Filter className="h-5 w-5 text-blue-600" />
              <h2 className="font-bold text-slate-800 tracking-tight">Visual Filters</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">Matching Category</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                   <button 
                    onClick={() => setDonorType("organ")}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${donorType === "organ" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                   >
                     Organ
                   </button>
                   <button 
                    onClick={() => setDonorType("blood")}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${donorType === "blood" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                   >
                     Blood
                   </button>
                </div>
              </div>

              {donorType === "organ" && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">Organ System</label>
                  <select 
                    value={organFilter}
                    onChange={(e) => setOrganFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                  >
                    {ORGAN_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </motion.div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">Blood Compatibility</label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_TYPES.map(bt => (
                    <button 
                      key={bt}
                      onClick={() => setBloodFilter(bt)}
                      className={`px-1 py-2.5 rounded-lg border text-[10px] font-black transition-all ${bloodFilter === bt ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 scale-105' : 'border-slate-200 text-slate-500 hover:border-blue-300 bg-white'}`}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">Urgency Threshold</label>
                <div className="space-y-2">
                  {URGENCY_LEVELS.map(u => (
                    <label key={u.value} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${urgencyFilter === u.label ? 'bg-blue-50/50 border-blue-100' : 'border-transparent hover:bg-slate-50'}`}>
                      <input 
                        type="radio" 
                        name="urgency" 
                        value={u.label} 
                        checked={urgencyFilter === u.label}
                        onChange={(e) => setUrgencyFilter(e.target.value)}
                        className="h-4 w-4 text-blue-600 accent-blue-600" 
                      />
                      <span className={`text-sm font-bold ${urgencyFilter === u.label ? 'text-blue-700' : 'text-slate-600'}`}>{u.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Search Radius Limit</label>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{searchRadius}km</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  step="5"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-400">
                  <span>5km</span>
                  <span>100km</span>
                </div>
              </div>
            </div>

            {filterStats && (
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Analytics</p>
                 <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2 rounded-lg">
                       <p className="text-[10px] font-bold text-slate-400">PASSED</p>
                       <p className="text-sm font-black text-slate-700">{filterStats.passed_clinical_filters}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                       <p className="text-[10px] font-bold text-slate-400">CHECKED</p>
                       <p className="text-sm font-black text-slate-700">{filterStats.total_donors_checked}</p>
                    </div>
                 </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
                <ShieldCheck className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 leading-tight">STATUS</p>
                <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Clinically Validated</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* Header Area */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Matching <span className="text-blue-600">Dashboard</span></h1>
              <p className="text-slate-500 text-sm mt-1 font-medium">XGBRanker v1.0 — Intelligent Bio-Compatibility Matrix</p>
            </div>
            <div className="relative w-full md:w-72 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search matching clinical IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Matches Section with Loading UI */}
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 w-full bg-white rounded-2xl border border-slate-100 animate-pulse flex flex-col p-6 space-y-4">
                  <div className="flex justify-between">
                    <div className="flex gap-4">
                       <div className="h-12 w-12 bg-slate-100 rounded-lg" />
                       <div className="space-y-2">
                          <div className="h-4 w-32 bg-slate-100 rounded" />
                          <div className="h-3 w-20 bg-slate-50 rounded" />
                       </div>
                    </div>
                    <div className="h-6 w-24 bg-slate-100 rounded-full" />
                  </div>
                  <div className="h-10 w-full bg-slate-50 rounded-lg" />
                  <div className="flex justify-between mt-auto">
                     <div className="h-4 w-32 bg-slate-50 rounded" />
                     <div className="h-8 w-32 bg-slate-100 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-10">
              <AnimatePresence mode="wait">
                {matches.length > 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-10"
                  >
                    {/* Top Match Spotlight - HUMAN CENTRIC REBRAND */}
                    <div>
                        <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2">
                          <HeartPulse className="h-3 w-3 text-red-500" /> Top Verified Donor Match
                        </h2>
                        <MatchCard 
                          match={matches[0]} 
                          isTopMatch={true} 
                          onProcure={(m) => { setSelectedMatch(m); setIsModalOpen(true); }}
                          category={donorType}
                        />
                    </div>

                    {/* Secondary List Section - HUMAN CENTRIC REBRAND */}
                    {matches.length > 1 && (
                      <div>
                        <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Available Registered Donors ({matches.length - 1})</h2>
                        <div className="space-y-4">
                          {matches.slice(1).map((m) => (
                            <MatchCard 
                              key={m.donor_id} 
                              match={m} 
                              onProcure={(med) => { setSelectedMatch(med); setIsModalOpen(true); }}
                              category={donorType}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  /* 5. Empty State Handling */
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-32 text-center bg-white rounded-3xl border border-dashed border-slate-200"
                  >
                    <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="h-10 w-10 text-slate-200" />
                    </div>
                    <p className="text-slate-800 font-black uppercase text-sm tracking-widest">No Matches Found for Filters</p>
                    <p className="text-slate-400 text-xs mt-3 max-w-xs mx-auto leading-relaxed">
                       Adjust the blood type or urgency parameters to widen the clinical search scope across the global network.
                    </p>
                    <button 
                      onClick={() => { setBloodFilter("O+"); setOrganFilter("Kidney"); setUrgencyFilter("Routine"); setSearchRadius(50); }}
                      className="mt-8 px-6 py-2.5 rounded-xl border border-blue-200 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm shadow-blue-50"
                    >
                      Reset Clinical Filters
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </main>
        </div>
      </div>

      <ProcureModal 
        match={selectedMatch} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

export default function ProfessionalMatchingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Loading Clinical Connectors...</div>}>
      <MatchingDashboardContent />
    </Suspense>
  );
}
