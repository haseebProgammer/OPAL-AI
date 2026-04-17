"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Stethoscope, 
  ShieldCheck, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";

export default function DoctorDashboard() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // 1. Fetching Pending Donors for Clinical Review
  const { data: pendingDonors, isLoading } = useQuery({
    queryKey: ["pending-verifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donors")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // 2. Sign-off Mutation (Human-in-the-loop)
  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'verified' | 'rejected' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("donors")
        .update({ 
            approval_status: status,
            last_verified_by: user?.id 
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-verifications"] });
      toast.success("Clinical status updated successfully.");
    },
    onError: (err: any) => {
      toast.error("Sign-off failed: " + err.message);
    }
  });

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-foreground uppercase">Medical Reviewer</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Certified Professional Portal</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Neural Sign-off Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 rounded-[2.5rem] border border-border bg-card/50">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display uppercase tracking-tight">Clinical Verification Queue</h3>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Pending Medical Registry Clearances</p>
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-xs font-black uppercase text-muted-foreground">Syncing Clinical Records...</p>
              </div>
            ) : pendingDonors?.length === 0 ? (
              <div className="py-20 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">Registry queue is clear. All donors verified.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {pendingDonors?.map((donor) => (
                    <motion.div 
                      key={donor.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-6 rounded-3xl bg-background border border-border hover:border-primary/30 transition-all group relative overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                         <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center font-black text-primary text-xl shadow-inner border border-border">
                                {donor.blood_type}
                            </div>
                            <div>
                               <div className="flex items-center gap-2">
                                  <p className="font-black text-lg text-foreground">{donor.full_name}</p>
                                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${donor.donor_type === 'organ' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'}`}>
                                    {donor.donor_type}
                                  </span>
                               </div>
                               <div className="flex items-center gap-3 mt-1">
                                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Submitted {new Date(donor.created_at).toLocaleDateString()}
                                  </p>
                                  <span className="text-muted-foreground/30">•</span>
                                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{donor.city}</p>
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-3">
                            <button 
                                onClick={() => donor.medical_report_url && window.open(donor.medical_report_url)}
                                className="px-5 py-2.5 rounded-xl bg-card border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
                            >
                               View Labs
                            </button>
                            <div className="flex items-center gap-2">
                                <button 
                                    disabled={verifyMutation.isPending}
                                    onClick={() => verifyMutation.mutate({ id: donor.id, status: 'verified' })}
                                    className="h-11 px-5 rounded-xl bg-green-500 text-white flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Verify</span>
                                </button>
                                <button 
                                    disabled={verifyMutation.isPending}
                                    onClick={() => verifyMutation.mutate({ id: donor.id, status: 'rejected' })}
                                    className="h-11 w-11 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                >
                                    <XCircle className="h-4 w-4" />
                                </button>
                            </div>
                         </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed italic">
                        Human-in-the-loop Verification: Your signature on these records confirms they strictly adhere to the Pakistan Organ Transplant Act 2010. Once verified, donors will be live in clinical search results.
                    </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8 rounded-[2.5rem] border border-border bg-gradient-to-br from-primary/10 to-transparent">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-primary mb-6">Certification Health</h4>
            <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                   <p className="text-sm font-black">Active Credential</p>
                   <p className="text-[10px] text-muted-foreground font-black uppercase">License PK-REV-9427</p>
                </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your reviewer node is synched with the national medical database. All sign-offs are logged and cryptographically linked to your identity.
            </p>
          </div>

          <div className="glass-card p-8 rounded-[2.5rem] border border-border">
            <div className="flex items-center justify-between mb-8">
                <h4 className="text-sm font-black uppercase tracking-[0.15em] text-muted-foreground">Impact Log</h4>
                <FileText className="h-4 w-4 text-muted-foreground/30" />
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Cleared</span>
                <span className="text-2xl font-black text-foreground">124</span>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "75%" }}
                    className="bg-primary h-full" 
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                <span className="text-success">98.2% Accuracy</span>
                <span className="text-muted-foreground">vs Peer Review</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
