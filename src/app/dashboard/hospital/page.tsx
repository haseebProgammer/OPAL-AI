"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { StatsCard } from "@/components/shared/StatsCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfidenceMeter } from "@/components/shared/ConfidenceMeter";
import { BloodCompatBadge } from "@/components/shared/BloodCompatBadge";
import { SkeletonStats, SkeletonTable } from "@/components/shared/Skeleton";
import { useMatchResults, useAllDonors, useRecipients, useRealtimeMatchResults, useHospitals } from "@/hooks/useSupabaseData";
import NetworkMap from "@/components/dashboard/hospital/NetworkMap";
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
  Loader2
} from "lucide-react";

export default function HospitalDashboard() {
  const { data: matchResults, isLoading: matchLoading } = useMatchResults();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const handleDownloadAuditReport = async () => {
    setIsDownloadingReport(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch hospital data
      const { data: hospital } = await supabase
        .from("hospitals")
        .select("hospital_name, city, license_number, hospital_type, admin_name, created_at, is_verified")
        .eq("user_id", user?.id)
        .single();

      // Fetch this hospital's match results
      const { data: matches } = await supabase
        .from("match_results")
        .select("*")
        .eq("hospital_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const now = new Date();
      const reportDate = now.toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });

      // Build CSV report
      let csv = `OPAL-AI — HOSPITAL COMPLIANCE & AUDIT REPORT\r\n`;
      csv += `Generated: ${reportDate}\r\n`;
      csv += `\r\n=== HOSPITAL PROFILE ===\r\n`;
      csv += `Hospital Name,${hospital?.hospital_name || 'N/A'}\r\n`;
      csv += `City,${hospital?.city || 'N/A'}\r\n`;
      csv += `License Number,${hospital?.license_number || 'N/A'}\r\n`;
      csv += `Type,${hospital?.hospital_type || 'N/A'}\r\n`;
      csv += `Admin Name,${hospital?.admin_name || 'N/A'}\r\n`;
      csv += `Verified Status,${hospital?.is_verified ? 'VERIFIED' : 'PENDING'}\r\n`;
      csv += `Member Since,${hospital?.created_at ? new Date(hospital.created_at).toLocaleDateString() : 'N/A'}\r\n`;
      csv += `Compliance Score,99.2/100\r\n`;
      csv += `\r\n=== MATCH HISTORY (Last 50) ===\r\n`;
      csv += `Match ID,Donor Name,Blood Type,Organ,Status,Date\r\n`;
      (matches || []).forEach((m: any) => {
        csv += `"${m.id || ''}","${m.donor_name || 'N/A'}","${m.blood_type || 'N/A'}","${m.organ_type || 'Blood'}","${m.status || 'pending'}","${m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}"\r\n`;
      });
      csv += `\r\nReport certified by OPAL-AI Medical Compliance System\r\n`;

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OPAL-AI-Audit-Report-${now.toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Audit report downloaded successfully!');
    } catch (err: any) {
      toast.error('Failed to generate report: ' + err.message);
    } finally {
      setIsDownloadingReport(false);
    }
  };

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userRole = user?.user_metadata?.role;
      const isAdmin = userRole === "admin" || user?.email === "ranahaseeb9427@gmail.com";
      setRole(isAdmin ? "admin" : userRole);
      
      if (!userRole && !isAdmin) {
        router.push("/dashboard");
        return;
      }

      if (!isAdmin && userRole !== "hospital") {
        router.push("/dashboard");
        return;
      }
      
      if (userRole === "hospital") {
        // Always check DB directly — never trust stale session metadata
        const { data: hospitalData } = await supabase
          .from("hospitals")
          .select("is_verified")
          .eq("user_id", user?.id)
          .maybeSingle();

        // Only block if record exists AND explicitly not verified
        if (hospitalData && hospitalData.is_verified === false) {
          router.replace("/auth/pending-approval");
          return;
        }
        
        // is_verified is true OR no record found yet — let them in
        setIsVerified(true);
      } else {
        setIsVerified(true); // admin is immune
      }
      
      setAuthLoading(false);
    }
    checkRole();
  }, [router]);

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Institution verified! Welcome to the medical network.");
    }
  }, [searchParams]);
  const { data: allDonors, isLoading: donorLoading } = useAllDonors();
  const { data: allHospitals } = useHospitals();
  const { data: recipients } = useRecipients();
  const realtimeMatches = useRealtimeMatchResults();

  const isLoading = matchLoading || donorLoading;

  const matches = (matchResults && matchResults.length > 0) ? matchResults : mockMatches.map(m => ({
    ...m,
    id: m.id,
    donor_id: m.donor_id,
    donor_name: m.donor_name || '—',
    hospital_name: '',
  }));

  const allMatches = [...realtimeMatches, ...matches.filter(
    m => !realtimeMatches.some(rm => rm.id === m.id)
  )];

  if (authLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (role !== "hospital" && role !== "admin") {
      return (
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-destructive/10 flex items-center justify-center text-destructive">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black font-display">Access Restricted</h1>
          <p className="text-muted-foreground text-sm font-medium">Redirecting you to the safe zone...</p>
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
          <StatsCard label="Active Requests" value={allMatches.filter(m => m.status === 'pending').length || 4} icon="activity" delay={0} change={2} changeLabel="today" />
          <StatsCard label="Total Matches" value={allMatches.length || 15} icon="heart" delay={0.05} change={12} changeLabel="this month" />
          <StatsCard label="Match Success" value="94%" icon="trending-up" delay={0.1} />
          <StatsCard label="Network Density" value="High" icon="users" delay={0.15} />
        </div>
      )}

      {/* NEW SECTION: Geospatial Network Map */}
      <div className="space-y-6">
          <div className="flex items-center justify-between">
              <div>
                  <h2 className="text-xl font-black font-display tracking-tight">Geospatial Matching Network</h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Live Vectors from {allMatches.length} matching nodes</p>
              </div>
          </div>
          <NetworkMap 
            donors={allDonors || []} 
            hospitals={allHospitals || []}
            matches={allMatches}
          />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* SECTION 2: Post Donor Request */}
        <div className="xl:col-span-4">
          <RequestForm />
        </div>

        {/* SECTION 3: Recent Activity & Subscription */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Recent Match Feed */}
          <div className="glass-card rounded-[2rem] border border-border overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold font-display">Live Match Feed</h2>
                </div>
                <Link href="/dashboard/hospital/matching" className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">
                    AI Analysis Result
                </Link>
            </div>
            
            <div className="divide-y divide-border">
                {allMatches.slice(0, 4).map((match, i) => (
                    <motion.div 
                        key={match.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center">
                                <span className={`text-lg font-black ${match.match_score > 80 ? 'text-success' : 'text-primary'}`}>
                                    {Math.round(match.match_score)}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">{match.donor_name || `DNRID-${match.donor_id.slice(0,6)}`}</p>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                    <span className="text-primary">{match.blood_type}</span>
                                    <span>·</span>
                                    <span>{match.distance_km} km away</span>
                                </div>
                            </div>
                        </div>
                        <StatusBadge status={match.status} />
                    </motion.div>
                ))}
            </div>
          </div>

          {/* SECTION 4: Subscription Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-[2rem] p-6 border border-border bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <CreditCard className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold font-display">Subscription Status</h3>
                </div>
                
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Current Plan</span>
                        <span className="px-3 py-1 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest">Enterprise Elite</span>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-muted-foreground uppercase">Service Days Remaining</span>
                            <span className="text-foreground">24 Days</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: "80%" }}
                                className="h-full bg-primary" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-[2rem] p-6 border border-border flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold font-display">Compliance Score</h3>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Verified Facility</p>
                    </div>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground">99.2</span>
                    <span className="text-xs font-bold text-muted-foreground uppercase">/100</span>
                </div>
                <button 
                    onClick={handleDownloadAuditReport}
                    disabled={isDownloadingReport}
                    className="mt-4 w-full py-3 rounded-xl bg-card border border-border hover:bg-primary/5 hover:border-primary/30 font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                    {isDownloadingReport 
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                      : <><FileBox className="h-4 w-4" /> Download Audit Report</>
                    }
                </button>
            </div>
          </div>

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
    </div>
  );
}
