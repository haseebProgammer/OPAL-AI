"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Loader2, ShieldCheck, Heart, Building2, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function checkSession() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        window.location.href = "/auth/login";
        return;
      }
      setUser(user);
      setLoading(false);
    }
    checkSession();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4 bg-background">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing Identity...</p>
      </div>
    );
  }

  const userEmail = user?.email?.toLowerCase();
  const isAdmin = userEmail === "ranahaseeb9427@gmail.com" || user?.user_metadata?.role === "admin";
  const isHospital = user?.user_metadata?.role === "hospital";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.1),transparent)] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl text-center space-y-12"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck className="h-4 w-4" /> Identity Verified
          </div>
          <h1 className="text-5xl font-black text-white font-display tracking-tight leading-tight">
            Welcome to the <br /><span className="text-primary text-6xl">Control Hub</span>
          </h1>
          <p className="text-slate-400 font-medium">Please select the terminal you wish to access today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {isAdmin && (
             <button 
               onClick={() => router.push("/dashboard/admin")}
               className="group p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/50 transition-all text-left"
             >
                <ShieldCheck className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-white mb-1">Admin Panel</h3>
                <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Master Oversight</p>
             </button>
           )}

           {(isHospital || isAdmin) && (
             <button 
               onClick={() => router.push("/dashboard/hospital")}
               className="group p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/50 transition-all text-left"
             >
                <Building2 className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-bold text-white mb-1">Hospital Portal</h3>
                <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Clinical Management</p>
             </button>
           )}

           <button 
             onClick={() => router.push("/dashboard/donor")}
             className="group p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/50 transition-all text-left"
           >
              <Heart className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-bold text-white mb-1">Donor Portal</h3>
              <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Personal Health Registry</p>
           </button>

           <button 
             onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = "/auth/login";
             }}
             className="group p-8 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 hover:bg-red-500 transition-all text-left"
           >
              <LogOut className="h-10 w-10 text-red-500 group-hover:text-white mb-4" />
              <h3 className="text-xl font-bold text-white group-hover:text-white mb-1">Sign Out</h3>
              <p className="text-xs text-red-400 group-hover:text-white/80 uppercase font-black tracking-widest">Clear Session</p>
           </button>
        </div>
      </motion.div>
    </div>
  );
}
