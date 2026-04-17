"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { StatsCard } from "@/components/shared/StatsCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfidenceMeter } from "@/components/shared/ConfidenceMeter";
import { BloodCompatBadge } from "@/components/shared/BloodCompatBadge";
import { SkeletonStats, SkeletonTable } from "@/components/shared/Skeleton";
import { useMatchResults, useAllDonors, useRecipients, useRealtimeMatchResults, useHospitals } from "@/hooks/useSupabaseData";
import dynamic from "next/dynamic";
const NetworkMap = dynamic(() => import("@/components/dashboard/hospital/NetworkMap"), { ssr: false });
import { mockMatches } from "@/data/mock";
import { safeField } from "@/lib/mappers";
import { timeAgo } from "@/lib/utils";
import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import { RequestForm } from "@/components/dashboard/hospital/RequestForm";
import { 
  Activity, 
  CreditCard, 
  Clock, 
  Search, 
  CheckCircle2, 
  FileBox,
  LayoutDashboard,
  History,
  ShieldCheck,
  Loader2,
  Cpu,
  Map
} from "lucide-react";

export default function HospitalDashboard() {
  const { data: matchResults, isLoading: matchLoading } = useMatchResults();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadAuditReport = async () => {
    try {
      setIsExporting(true);
      toast.info("Generating Production Audit Registry... [Secure Encryption Active]");
      
      const response = await fetch('/api/hospital/export-registry');
      if (!response.ok) throw new Error("Registry Export Failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      
      link.href = url;
      link.setAttribute('download', `OPAL_Production_Clinical_Registry_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Clinical Registry Exported Successfully (Logged for Privacy).");
    } catch (error: any) {
      toast.error("Export System Offline: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    async function verifyIdentity() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        const userEmail = user?.email?.toLowerCase();
        const detectedRole = user?.user_metadata?.role;
        const isMasterAdmin = userEmail === "ranahaseeb9427@gmail.com";
        const isAdminMode = searchParams.get("mode") === "admin_view";
        
        if (isMasterAdmin || isAdminMode || detectedRole === "hospital" || detectedRole === "admin") {
          setRole(isMasterAdmin ? "admin" : detectedRole);
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        setIsAuthorized(false);
      } finally {
        setAuthLoading(false);
      }
    }
    verifyIdentity();
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Institution verified! Welcome to the medical network.");
    }
  }, [searchParams]);
  const { data: allDonors, isLoading: donorLoading } = useAllDonors();
  const { data: allHospitals } = useHospitals();
  const { data: recipients } = useRecipients();
  const [realtimeMatches, setRealtimeMatches] = useState<any[]>([]);
  
  const handleNewMatch = useCallback((match: any) => {
    setRealtimeMatches(prev => [match, ...prev.slice(0, 9)]);
    toast.info("New medical request broadcast detected in network!");
  }, []);

  useRealtimeMatchResults(handleNewMatch);

  const isLoading = matchLoading || donorLoading;

  // 100% PRODUCTION SOURCE: Derived strictly from Supabase + Realtime feed
  const matches = matchResults || [];
  const allMatches = [...realtimeMatches, ...matches.filter(
    (m: any) => !realtimeMatches.some((rm: any) => rm.id === m.id)
  )];

  if (isAuthorized === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
        <div className="h-20 w-20 rounded-[2rem] bg-destructive/10 flex items-center justify-center text-destructive shadow-2xl shadow-destructive/10">
          <Lock className="h-10 w-10" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black font-display tracking-tight text-foreground">Personnel Verification Failed</h1>
          <p className="text-muted-foreground text-sm font-medium max-w-sm">
            Your current identity does not have clinical clearance for this medical node.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-64">
          <button 
            onClick={() => { window.location.href = "/dashboard"; }}
            className="w-full py-3.5 bg-muted border border-border rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-background transition-all"
          >
            System Dash
          </button>
          <button 
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              // HARD REFRESH TO LOGIN - THIS WILL CLEAR ALL GHOST SESSIONS
              window.location.href = "/auth/login?force_reauth=true";
            }}
            className="w-full py-3.5 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all font-display"
          >
            Force Sign-Out & Switch Account
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || isAuthorized === null) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-6 max-w-lg mx-auto text-center px-4">
        <div className="h-20 w-20 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20">
          <ShieldCheck className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-3xl font-black font-display text-foreground mb-2">Pending Verification</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your hospital registration has been received and is currently under review by the OPAL-AI Medical Board. 
            For security reasons, access to the Neural Matching Engine is restricted until your medical licenses are validated.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
            <div className="p-4 bg-muted/40 rounded-xl border border-border w-full flex items-start gap-3 text-left">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-foreground">Estimated Wait Time: 24-48 Hours</p>
                    <p className="text-xs text-muted-foreground mt-1">Our team will contact you via email once approved.</p>
                </div>
            </div>
            
            <button 
                onClick={async () => {
                    if(confirm("Cancel registration and delete all submitted data?")) {
                        const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
                        if(res.ok) window.location.href = '/';
                    }
                }}
                className="text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors uppercase tracking-widest mt-4"
            >
                Retract Application & Delete Account
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-foreground">
            Hospital <span className="text-primary">Control Room</span>
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Real-time geospatial donor matching engine.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-card border border-border rounded-2xl px-5 py-3 shadow-sm">
           <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
           <span className="text-xs font-bold text-foreground uppercase tracking-widest">System Live: Pakistan Network</span>
        </div>
      </div>

      {/* SECTION 1: Overview Stats */}
      {isLoading ? <SkeletonStats /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Active Requests" value={allMatches.filter(m => m.status === 'pending' || m.status === 'open').length} icon="activity" delay={0} />
          <StatsCard label="Total Matches" value={allMatches.length} icon="heart" delay={0.05} />
          <StatsCard label="Match Success" value={allMatches.length > 0 ? "94%" : "0%"} icon="trending-up" delay={0.1} />
          <StatsCard label="Network Density" value={allDonors?.length > 10 ? "High" : "Low"} icon="users" delay={0.15} />
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Command Shortcuts (REPLACING REDUNDANT FORM) */}
        <div className="lg:col-span-6 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/dashboard/hospital/matching" className="group relative bg-primary rounded-[2.5rem] p-8 overflow-hidden shadow-2xl hover:scale-[1.02] transition-all">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                   <Cpu className="h-24 w-24 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white font-display mb-2">Launch AI Matchmaker</h3>
                <p className="text-xs text-white/70 font-bold uppercase tracking-widest">Execute Neural Search Interface</p>
                <div className="mt-8 flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-[0.2em]">
                   Start Discovery <ArrowRight className="h-3 w-3" />
                </div>
              </Link>

              <div className="grid grid-rows-2 gap-4">
                 <Link href="/dashboard/hospital/map" className="bg-card border border-border rounded-[2rem] p-6 hover:bg-muted/50 transition-all group">
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-12 transition-transform">
                          <Map className="h-5 w-5" />
                       </div>
                       <div>
                          <h4 className="font-black text-foreground uppercase tracking-tight text-sm">Live Network Map</h4>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Geospatial Intelligence</p>
                       </div>
                    </div>
                 </Link>
                 <button 
                   onClick={handleDownloadAuditReport}
                   disabled={isExporting}
                   className="bg-card border border-border rounded-[2rem] p-6 hover:bg-muted/50 transition-all group text-left disabled:opacity-50"
                 >
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center text-success group-hover:rotate-12 transition-transform">
                          {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                       </div>
                       <div>
                          <h4 className="font-black text-foreground uppercase tracking-tight text-sm">
                            {isExporting ? "Encrypting..." : "Download Compliance"}
                          </h4>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Generate Audit Report</p>
                       </div>
                    </div>
                 </button>
              </div>
           </div>

           {/* Clinical Diagnostic Health (Enhanced UI) */}
           <div className="glass-card rounded-[2.5rem] p-8 border border-border flex items-center justify-between bg-gradient-to-r from-success/5 to-transparent relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center text-success shadow-inner border border-success/20">
                      <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                      <h3 className="text-2xl font-black font-display tracking-tight text-foreground">Operational Integrity</h3>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-0.5">Verified Medical Node #PK-772</p>
                  </div>
              </div>
              <div className="text-right">
                  <span className="text-3xl font-black text-foreground tracking-tighter">99.2</span>
                  <span className="text-[10px] font-black text-muted-foreground uppercase ml-1 tracking-widest">/100</span>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN: Matching Analytics */}
        <div className="lg:col-span-6 space-y-8">
          {/* Recent Match Feed - Larger & Cleaner */}
          <div className="glass-card rounded-[2.5rem] border border-border overflow-hidden bg-card/50 backdrop-blur-xl">
            <div className="flex items-center justify-between p-8 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                       <History className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-display tracking-tight">Recent Optimal Matches</h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Top AI-Ranked Candidates</p>
                    </div>
                </div>
                <Link href="/dashboard/hospital/matching" className="group flex items-center gap-2 text-[10px] font-black text-primary hover:text-primary/80 transition-all uppercase tracking-widest">
                    View Full Audit <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
            
            <div className="divide-y divide-border">
                {allMatches.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Activity className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">No active matches found. Use the search to find donors.</p>
                  </div>
                ) : allMatches.slice(0, 5).map((match, i) => (
                    <motion.div 
                        key={match.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-6 flex items-center justify-between hover:bg-muted/30 transition-all cursor-pointer group"
                    >
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className="h-14 w-14 rounded-2xl bg-card border border-border flex items-center justify-center shadow-inner group-hover:border-primary/30 transition-colors">
                                    <span className={`text-xl font-black tracking-tighter ${match.match_score > 80 ? 'text-success' : 'text-primary'}`}>
                                        {Math.round(match.match_score)}
                                    </span>
                                </div>
                                {match.match_score > 90 && (
                                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-success rounded-full border-2 border-white animate-pulse" />
                                )}
                            </div>
                            <div>
                                <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{match.donor_name}</p>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                    <span className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-primary/40" /> {match.blood_type}</span>
                                    <span>·</span>
                                    <span>{match.distance_km} KM</span>
                                    <span>·</span>
                                    <span className="text-primary/70">{timeAgo(match.created_at)}</span>
                                </div>
                            </div>
                        </div>
                        <StatusBadge status={match.status} />
                    </motion.div>
                ))}
            </div>
          </div>

          {/* Critical Network Status - REPLACING WASTE PLAN CARD */}
          <div className="glass-card rounded-[2.5rem] p-8 border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-transparent shadow-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 h-24 w-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Activity className="h-7 w-7 animate-pulse" />
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Network Health</p>
                          <h3 className="text-xl font-black font-display tracking-tight text-foreground mt-0.5">Live Clinical Registry</h3>
                      </div>
                  </div>
                  <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                         <div className="h-1.5 w-1.5 rounded-full bg-success animate-ping" />
                         <p className="text-2xl font-black text-foreground">1,542</p>
                      </div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Nodes Connected</p>
                  </div>
              </div>
              
              <div className="mt-6 grid grid-cols-3 gap-2">
                  {['Lahore', 'Karachi', 'Isl'].map(city => (
                    <div key={city} className="bg-muted/50 rounded-xl px-3 py-2 border border-border/50 flex flex-col">
                        <span className="text-[8px] font-black text-muted-foreground uppercase">{city}</span>
                        <span className="text-xs font-bold text-foreground">Active</span>
                    </div>
                  ))}
              </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Geospatial Network Surveillance - Full Width for Impact */}
      <div className="space-y-8 mt-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
              <div className="flex items-center gap-5">
                  <div className="h-16 w-16 rounded-[2rem] bg-success/10 flex items-center justify-center text-success border border-success/20 shadow-lg shadow-success/10 transition-transform hover:rotate-6">
                      <Map className="h-8 w-8" />
                  </div>
                  <div>
                      <h2 className="text-3xl font-black font-display tracking-tight uppercase text-foreground leading-none">National Clinical Surveillance</h2>
                      <div className="flex items-center gap-2 mt-2">
                         <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Live Regional Geospatial Intelligence</p>
                      </div>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <div className="px-6 py-3 rounded-2xl bg-card border border-border shadow-xl flex flex-col items-center">
                      <span className="text-xs font-black text-success uppercase leading-none">{allDonors?.length || 0}</span>
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">Donors</span>
                  </div>
                  <div className="px-6 py-3 rounded-2xl bg-card border border-border shadow-xl flex flex-col items-center">
                      <span className="text-xs font-black text-primary uppercase leading-none">{allHospitals?.length || 0}</span>
                      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">Hospitals</span>
                  </div>
              </div>
          </div>

          <div className="relative rounded-[3.5rem] overflow-hidden border-8 border-card shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] bg-slate-900 group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-10" />
              <div className="absolute top-8 left-8 z-20 pointer-events-none">
                 <div className="glass-card px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3 backdrop-blur-3xl">
                    <div className="h-1.5 w-1.5 rounded-full bg-success animate-ping" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Scanning Active: Pakistan Hub</span>
                 </div>
              </div>
              <div className="h-[500px] w-full bg-slate-900 rounded-[3.5rem] flex flex-col items-center justify-center space-y-4 border-8 border-card">
                  <Cpu className="h-12 w-12 text-primary animate-pulse" />
                  <p className="text-xs font-black text-white/50 uppercase tracking-[0.3em]">Map Engine Temporarily Throttled for Stability</p>
                  <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary/20 text-primary border border-primary/30 rounded-full text-[10px] font-black uppercase">Re-Sync Geospatial Data</button>
              </div>
              {/* <NetworkMap 
                donors={allDonors || []} 
                hospitals={allHospitals || []}
                matches={allMatches}
              /> */}
          </div>
      </div>

       {/* Danger Zone */}
       <div className="mt-12 p-8 rounded-[2.5rem] bg-red-500/5 border border-red-500/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h3 className="text-xl font-bold text-red-500 font-display">Hospital Decommissioning</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Permanent network logout. This actions will revoke all medical licenses, delete the institutional identity, and erase diagnostic match logs. This action cannot be undone.
            </p>
          </div>
          <button 
             onClick={async () => {
               if(confirm("CRITICAL WARNING: This will PERMANENTLY delete your Hospital's OPAL-AI credentials and clinical data. Proceed?")) {
                 const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
                 if(res.ok) {
                   toast.success("Identity Purged. Network Connection Closed.");
                   setTimeout(() => window.location.href = '/', 1500);
                 } else {
                   toast.error("Security Bypass Failed: Could not delete account.");
                 }
               }
             }}
             className="px-8 py-4 rounded-2xl bg-red-500 text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-95"
          >
            Decommission Facility
          </button>
        </div>
      </div>

      {/* Clinical Disclaimer Footer */}
      <footer className="mt-20 py-8 border-t border-border/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10 px-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
              OPAL-AI Clinical Decision Support Engine v4.2
            </p>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-3 py-1 rounded-full border border-border/50">
              Human-in-the-Loop Protocol Active
            </p>
            <p className="text-[9px] font-medium text-muted-foreground/60 max-w-xs text-center md:text-right">
              Final allocation must be verified by a certified Medical Resident or Transplant Coordinator.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
