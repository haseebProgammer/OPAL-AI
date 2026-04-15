"use client";

import { motion } from "framer-motion";
import { Clock, Mail, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-red-500/5 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-card p-10 rounded-[2.5rem] border border-border shadow-2xl relative">
          
          {/* Aesthetic Ring */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-background rounded-full border border-border flex items-center justify-center shadow-xl">
            <div className="w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <Clock className="w-10 h-10 text-yellow-500 animate-[spin_8s_linear_infinite]" />
            </div>
          </div>

          <div className="mt-8 text-center">
            <h1 className="text-3xl font-black text-foreground mb-3 font-display tracking-tight">
              Application <br/> <span className="text-primary italic">Under Review</span>
            </h1>
            
            <p className="text-muted-foreground mb-8 leading-relaxed font-medium">
              Your credentials are being verified by our medical administration board. This process ensures the integrity of the life-saving network.
            </p>

            {/* Status Steps Flow */}
            <div className="space-y-4 mb-10 text-left">
              <motion.div 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-green-500/5 border border-green-500/20"
              >
                <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                   <ShieldCheck className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-green-500">Step 1: Submitted</p>
                  <p className="text-sm font-bold text-foreground/80">Profile data successfully synced</p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 h-1 w-full bg-yellow-500/10 animate-shimmer" />
                <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
                   <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-yellow-500">Step 2: Verification</p>
                  <p className="text-sm font-bold text-foreground/80">Clinical and ID review in progress</p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 grayscale opacity-60"
              >
                <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                   <Mail className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Step 3: Ready</p>
                  <p className="text-sm font-bold text-muted-foreground">Final e-mail dispatch</p>
                </div>
              </motion.div>
            </div>

            <div className="flex flex-col gap-4">
               <Link
                href="/"
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Portal
              </Link>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                Need help? <a href="mailto:support@opal-ai.org" className="text-primary hover:underline">Contact Support</a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
