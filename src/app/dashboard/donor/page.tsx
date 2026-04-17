"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { StatsCard } from "@/components/shared/StatsCard";
import { SkeletonStats, SkeletonTable } from "@/components/shared/Skeleton";
import { useBloodDonors } from "@/hooks/useSupabaseData";
import { safeField } from "@/lib/mappers";
import { mockDonors } from "@/data/mock";
import {
  Heart,
  Droplets,
  Calendar,
  Shield,
  Power,
  Bell,
  History,
  Zap,
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DonorDashboard() {
  const { data: liveDonors, isLoading: donorsLoading } = useBloodDonors();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      const userRole = user?.user_metadata?.role;
      const isAdminEmail = user?.email?.toLowerCase() === "ranahaseeb9427@gmail.com";
      const isAdminMode = searchParams.get("mode") === "admin_view";
      const isAdmin = userRole === "admin" || isAdminEmail || isAdminMode;
      
      setRole(isAdmin ? "admin" : userRole);
      setAuthLoading(false);
    }
    checkRole();
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Account verified successfully! Welcome to OPAL-AI.");
    }
  }, [searchParams]);

  // Use first live donor, or mock fallback
  const donor = (liveDonors && liveDonors.length > 0)
    ? liveDonors[0]
    : {
        id: mockDonors[0].id,
        full_name: mockDonors[0].full_name,
        first_name: 'Ahmed',
        last_name: 'Khan',
        blood_type: mockDonors[0].blood_type,
        donating_items: 'Whole Blood',
        city: mockDonors[0].city,
        hospital_name: 'Aga Khan Hospital',
        is_available: mockDonors[0].is_available,
        medical_conditions: 'None',
        hepatitis_status: 'negative',
        time_of_death: null,
        cause_of_death: null,
        donor_type: 'blood' as const,
        created_at: mockDonors[0].created_at,
      };

  const [isAvailable, setIsAvailable] = useState(donor.is_available);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      const res = await fetch("/api/admin/toggle-donor", { 
        method: "POST",
        body: JSON.stringify({ donor_id: donor.id, type: donor.donor_type, current_status: isAvailable })
      });
      if (!res.ok) throw new Error("Status update failed");
      setIsAvailable(!isAvailable);
      toast.success(`You are now ${!isAvailable ? 'LIVE' : 'OFFLINE'}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsToggling(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (role !== "donor" && role !== "admin") {
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

  return (
    <div className="space-y-10 pb-20">
      {/* SECTION 1: Welcome & Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black font-display tracking-tight text-foreground">
            Hi, {donor.full_name?.split(' ')[0] || 'Donor'} 👋
          </h1>
          <p className="text-muted-foreground font-medium">
            Manage your status and donation records.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          disabled={isToggling}
          className={`group relative flex items-center gap-4 rounded-3xl px-8 py-4 text-sm font-black tracking-widest uppercase transition-all shadow-2xl ${
            isAvailable
              ? "bg-primary text-white shadow-primary/30"
              : "bg-muted text-muted-foreground shadow-none grayscale"
          }`}
        >
          {isToggling ? <Loader2 className="h-5 w-5 animate-spin" /> : <Power className="h-5 w-5" />}
          <span>{isAvailable ? "Live Network" : "Offline"}</span>
          <div className={`h-4 w-4 rounded-full border-2 border-white/30 ${isAvailable ? "bg-white pulse-live" : "bg-muted-foreground"}`} />
        </motion.button>
      </div>

      <AnimatePresence>
        {isAvailable && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl bg-primary/5 border border-primary/20 p-5 flex items-start gap-4"
          >
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-foreground font-bold">Visibility Active</p>
              <p className="text-xs text-muted-foreground mt-0.5">Hospitals can now find you in real-time matching queries within your city.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 2: Profile Summary & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
           <StatsCard label="Medical Profile" value={donor.blood_type} icon="heart" delay={0} />
           <StatsCard label="Primary Interest" value={donor.donating_items || '—'} icon="activity" delay={0.05} />
           <StatsCard label="Base City" value={donor.city} icon="building" delay={0.1} />
           <StatsCard label="Matching Speed" value="< 2s" icon="zap" delay={0.15} />
        </div>

        <div className="glass-card rounded-3xl p-6 border border-border flex flex-col justify-between">
           <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Profile Integrity</p>
              <h3 className="text-xl font-bold font-display">Identity Verified</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Your account is fully compliant with OPAL-AI security protocols.</p>
           </div>
           <button className="mt-6 w-full py-3 rounded-xl bg-card border border-border hover:bg-muted font-bold text-xs uppercase tracking-widest transition-colors">
              Edit Health Profile
           </button>
        </div>
      </div>

      {/* SECTION 3: Donation History */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Donation History
        </h2>
        <div className="glass-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Institution</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic text-sm">
                        No donation records found yet. Start by activating your availability.
                    </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4: Notifications */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Match Notifications
        </h2>
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-muted/10 opacity-60">
            <p className="text-sm font-medium text-muted-foreground italic">
                You will receive alerts here when a hospital attempts to match with your profile.
            </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-12 p-8 rounded-[2rem] bg-red-500/5 border border-red-500/10 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-red-500 uppercase tracking-tight">Danger Zone</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Once you delete your account, there is no going back. All clinical records and donation history will be permanently erased.
          </p>
        </div>
        <button 
           onClick={async () => {
             if(confirm("Are you absolutely sure? This will PERMANENTLY delete your OPAL-AI clinical donor profile.")) {
               const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
               if(res.ok) {
                 window.location.href = '/';
               } else {
                 alert("Access Denied: Could not purge account.");
               }
             }
           }}
           className="px-6 py-3 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
        >
          Purge Clinical Identity
        </button>
      </div>
    </div>
  );
}
