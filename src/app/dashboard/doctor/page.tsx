"use client";

import { motion } from "framer-motion";
import { Stethoscope, ShieldCheck, FileText, CheckCircle } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export default function DoctorDashboard() {
  const pendingVerifications = []; // Will be hooked to Supabase

  return (
    <div className="space-y-10 pb-20">
      <div>
        <h1 className="text-3xl font-black font-display tracking-tight text-foreground uppercase">Medical Reviewer</h1>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Certified Professional Portal</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 rounded-[2rem] border border-border">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold font-display uppercase tracking-tight">Pending Clearances</h3>
            </div>

            {pendingVerifications.length === 0 ? (
              <div className="space-y-4">
                 {/* Simulated Verification Card */}
                 <div className="p-6 rounded-2xl bg-background border border-border hover:border-primary transition-all group">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center font-black text-primary">DP</div>
                          <div>
                             <p className="text-sm font-bold">Daniyal Pasha</p>
                             <p className="text-[10px] text-muted-foreground uppercase font-black">Organ Donor (Kidney)</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <button className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                             View Lab Reports (PDF)
                          </button>
                          <button className="p-2 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all">
                             <CheckCircle className="h-4 w-4" />
                          </button>
                       </div>
                    </div>
                 </div>
                 
                 <p className="text-[10px] text-center text-muted-foreground mt-4 italic">
                    Note: Document review is mandatory under the Pakistan Organ Transplant Act.
                 </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Pending donor rows would go here */}
              </div>
            )}
          </div>
        </div>

        {/* Doctor Stats/Profile */}
        <div className="space-y-6">
          <div className="glass-card p-8 rounded-[2rem] border border-border bg-primary/5">
            <ShieldCheck className="h-8 w-8 text-primary mb-4" />
            <h4 className="text-sm font-black uppercase tracking-widest mb-2">Certification Active</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your credentials as a Medical Reviewer are active for the current cycle. All verifications are legally binding.
            </p>
          </div>

          <div className="glass-card p-8 rounded-[2rem] border border-border">
            <FileText className="h-8 w-8 text-muted-foreground mb-4" />
            <h4 className="text-sm font-black uppercase tracking-widest mb-2">Platform Impact</h4>
            <div className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Verified Donors</span>
                <span className="text-sm font-black">0</span>
              </div>
              <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
