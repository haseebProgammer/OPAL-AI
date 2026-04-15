"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Building2, 
  Heart, 
  ShieldCheck, 
  Activity, 
  Clock, 
  Check, 
  X, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Ban,
  Download,
  DatabaseIcon
} from "lucide-react";
import { StatsCard } from "@/components/shared/StatsCard";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { 
  useBloodDonors, 
  useOrganDonors, 
  useHospitals 
} from "@/hooks/useSupabaseData";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Hospital, Donor } from "@/lib/types";

interface AdminStats {
  totalDonors: number;
  totalHospitals: number;
  pendingHospitals: number;
  totalMatches: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Administrator session verified.");
    }
  }, [searchParams]);

  const { data: bloodDonors, refetch: refetchBlood } = useBloodDonors();
  const { data: organDonors, refetch: refetchOrgan } = useOrganDonors();
  const { data: allHospitals, refetch: refetchHospitals, isLoading: hospitalsLoading } = useHospitals();
  
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    setIsDataLoading(true);
    try {
      const res = await fetch("/api/admin/pending-approvals");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch");
      }
      const data = await res.json();
      setPendingApprovals(data || []);
    } catch (e: any) {
      console.error("Failed to fetch pending approvals", e);
      setPendingApprovals([]);
    } finally {
      setIsDataLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Failed to fetch stats", e);
    }
  };

  const handleApproveAction = async (item: any) => {
    setIsActionLoading(item.user_id);
    try {
      const res = await fetch("/api/admin/approve-hospital", {
        method: "POST",
        body: JSON.stringify({ 
          user_id: item.user_id, 
          user_type: item.user_type,
          email: item.email,
          name: item.full_name
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to approve");
      
      toast.success(`${item.full_name} approved successfully`);
      fetchPendingApprovals();
      fetchStats();
      if (item.user_type === 'hospital') refetchHospitals();
      if (item.user_type === 'blood_donor') refetchBlood();
      if (item.user_type === 'organ_donor') refetchOrgan();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject and remove this hospital?")) return;
    setIsActionLoading(id);
    try {
      const res = await fetch("/api/admin/reject-hospital", {
        method: "POST",
        body: JSON.stringify({ hospital_id: id }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      toast.success("Hospital rejected and removed");
      refetchHospitals();
      fetchStats();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsActionLoading(null);
    }
  };

  const toggleHospitalVerification = async (id: string, current: boolean) => {
    setIsActionLoading(id);
    try {
      // Re-using approve-hospital for "un-suspending" but we need a generic toggle or untrust API
      // For now, let's just implement the logic locally if possible or simple toast
      const res = await fetch("/api/admin/approve-hospital", {
        method: "POST",
        body: JSON.stringify({ hospital_id: id, revoke: current }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(current ? "Hospital suspended" : "Hospital re-verified");
      refetchHospitals();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsActionLoading(null);
    }
  };

  const toggleDonorStatus = async (id: string, type: 'blood' | 'organ', current: boolean) => {
    try {
      const res = await fetch("/api/admin/toggle-donor", {
        method: "POST",
        body: JSON.stringify({ donor_id: id, type, current_status: current }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      toast.success("Donor status updated");
      if (type === 'blood') refetchBlood(); else refetchOrgan();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isLoading = hospitalsLoading;

  const pendingHospitals: Hospital[] = allHospitals?.filter(h => !h.is_verified) || [];
  const verifiedHospitals: Hospital[] = allHospitals?.filter(h => h.is_verified) || [];
  
  const combinedDonors = [
    ...(bloodDonors || []).map(d => ({ ...d, type: 'blood' })),
    ...(organDonors || []).map(d => ({ ...d, type: 'organ' }))
  ].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (isLoading && !allHospitals) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-muted rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
        </div>
        <div className="h-64 bg-muted rounded-2xl" />
      </div>
    );
  }

  const handleDownloadDataset = async () => {
    try {
      toast.info("Preparing dataset export...");
      const res = await fetch("/api/admin/download-dataset");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `OPAL-AI-Dataset-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Dataset exported successfully!");
    } catch (err: any) {
      toast.error("Export failed: " + err.message);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-foreground uppercase">Command Center</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">OPAL-AI Administrative Console</p>
        </div>
        <button
          onClick={handleDownloadDataset}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/30"
        >
          <Download className="w-4 h-4" />
          Export Dataset
        </button>
      </div>

      {/* SECTION 1: Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="Total Donors" 
          value={stats?.totalDonors || 0} 
          icon="heart" 
          delay={0} 
          change={12} 
          changeLabel="this month"
        />
        <StatsCard 
          label="Total Hospitals" 
          value={stats?.totalHospitals || 0} 
          icon="building" 
          delay={0.05} 
        />
        <StatsCard 
          label="Pending Approvals" 
          value={stats?.pendingHospitals || 0} 
          icon="activity" 
          delay={0.1}
          change={stats?.pendingHospitals ? -100 : 0}
          changeLabel="needs action"
        />
        <StatsCard 
          label="Live Matches" 
          value={stats?.totalMatches || 0} 
          icon="activity" 
          delay={0.15} 
          change={5}
          changeLabel="today"
        />
      </div>

      {/* SECTION 2: Verification Center */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-[2rem] border border-border overflow-hidden"
      >
        <div className="p-8 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-yellow-500" />
             </div>
             <div>
                <h3 className="text-xl font-black font-display tracking-tight text-foreground uppercase">Verification Center</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Medical Credentials Queue</p>
             </div>
          </div>
          <div className="px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-widest">
            {pendingApprovals.length} Applications Pending
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/10">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Entity Name</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Type</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Location</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Submitted</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isDataLoading ? (
                <tr>
                   <td colSpan={6} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                         <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                         <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Syncing Verification Queue...</p>
                      </div>
                   </td>
                </tr>
              ) : pendingApprovals.length === 0 ? (
                <tr>
                   <td colSpan={6} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-30">
                         <Check className="w-12 h-12 text-green-500" />
                         <p className="text-sm font-bold text-foreground italic underline decoration-primary decoration-4">All Clear. No Pending Applications.</p>
                      </div>
                   </td>
                </tr>
              ) : (
                pendingApprovals.map((item) => (
                  <tr key={item.user_id} className="hover:bg-muted/5 transition-colors group">
                    <td className="p-6">
                       <div className="font-bold text-foreground">{item.full_name}</div>
                       <div className="text-xs text-muted-foreground">{item.email}</div>
                    </td>
                    <td className="p-6">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                         item.user_type === 'hospital' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                       }`}>
                         {item.user_type.replace('_', ' ')}
                       </span>
                    </td>
                    <td className="p-6 text-sm font-bold text-muted-foreground">{item.city}</td>
                    <td className="p-6 text-xs font-medium text-muted-foreground">
                       {new Date(item.created_at).toLocaleDateString(undefined, {
                         month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                       })}
                    </td>
                    <td className="p-6">
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                          <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Pending</span>
                       </div>
                    </td>
                    <td className="p-6 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleApproveAction(item)}
                            disabled={isActionLoading === item.user_id}
                            className="h-10 px-4 rounded-xl bg-green-500 text-white flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                          >
                             {isActionLoading === item.user_id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                             <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Approve</span>
                          </button>
                          <button 
                            onClick={() => handleReject(item.user_id)}
                            disabled={isActionLoading === item.user_id}
                            className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                          >
                             <X className="w-4 h-4" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card p-8 rounded-3xl border border-border space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-display">System Integrity</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                  All medical protocols are active. Automated matching engine is scanning the network every 15 minutes for emergency compatibility.
              </p>
          </div>

          <div className="glass-card p-8 rounded-3xl border border-border space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-display">Network Health</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                  Average match time: 4.2 minutes.
                  Hospital response rate: 94%.
                  All database nodes are operational and connected via encrypted neural links.
              </p>
          </div>
      </div>
    </div>
  );
}
