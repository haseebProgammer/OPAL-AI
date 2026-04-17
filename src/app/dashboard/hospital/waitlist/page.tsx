"use client";

import { motion } from "framer-motion";
import { 
  Hourglass, 
  Search, 
  AlertCircle, 
  Clock, 
  Activity, 
  ShieldCheck,
  Zap
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default function WaitlistPage() {
  const supabase = createClient();

  // Fetching pending requests from the 'organ_requests' table (serving as waitlist)
  const { data: waitlist, isLoading } = useQuery({
    queryKey: ["hospital-waitlist"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: hospital } = await supabase.from("hospitals").select("id").eq("user_id", user?.id).single();
      
      const { data, error } = await supabase
        .from("organ_requests")
        .select("*")
        .eq("hospital_id", hospital?.id)
        .eq("status", "open")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-foreground uppercase">Patient Waitlist</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Queued Medical Requirements</p>
        </div>
        <div className="flex items-center gap-3 bg-secondary/50 px-5 py-3 rounded-2xl border border-border">
          <Zap className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase text-foreground tracking-widest text-primary">Scanning Network every 15m</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="glass-card p-6 rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-transparent">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Total Queued</h4>
            <p className="text-4xl font-black text-foreground">{waitlist?.length || 0}</p>
        </div>
        <div className="glass-card p-6 rounded-3xl border border-border">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Avg. Wait Time</h4>
            <p className="text-4xl font-black text-foreground">1.4d</p>
        </div>
        <div className="glass-card p-6 rounded-3xl border border-border">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Priority High</h4>
            <p className="text-4xl font-black text-red-500">{waitlist?.filter(r => r.urgency_level === 'Emergency').length || 0}</p>
        </div>
        <div className="glass-card p-6 rounded-3xl border border-border">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Network Health</h4>
            <div className="flex items-center gap-2 mt-2">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-[94%] bg-success" />
                </div>
                <span className="text-xs font-black">94%</span>
            </div>
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] border border-border overflow-hidden bg-white/50 backdrop-blur-xl">
        <div className="p-8 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Hourglass className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-display uppercase tracking-tight">Requirement Queue</h3>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Organ & Blood Requests Waiting for AI Match</p>
            </div>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Filter patients..." 
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-xs outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Patient ID</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Requirement</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Blood Type</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Urgency</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Wait Duration</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                   <td colSpan={7} className="p-20 text-center">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-xs font-black uppercase text-muted-foreground">Syncing Waitlist Cache...</p>
                   </td>
                </tr>
              ) : waitlist?.length === 0 ? (
                <tr>
                   <td colSpan={7} className="p-20 text-center">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No Active Waitlist Entries</p>
                        <p className="text-xs text-muted-foreground mt-2">All patients have been successfully matched with verified donors.</p>
                   </td>
                </tr>
              ) : (
                waitlist?.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-8 py-6 font-mono text-[10px] font-black text-muted-foreground uppercase">
                        #{entry.id.substring(0, 8)}
                    </td>
                    <td className="px-8 py-6">
                        <span className="text-sm font-black text-foreground uppercase tracking-tight">
                            {entry.required_organs?.[0] || 'Unknown'}
                        </span>
                    </td>
                    <td className="px-8 py-6">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                            {entry.patient_blood_type}
                        </div>
                    </td>
                    <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                             <div className={`h-1.5 w-1.5 rounded-full ${entry.urgency_level === 'Emergency' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                             <span className="text-[10px] font-black uppercase text-foreground">{entry.urgency_level}</span>
                        </div>
                    </td>
                    <td className="px-8 py-6 font-bold text-xs text-muted-foreground">
                        {Math.floor((Date.now() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60 * 24))} Days
                    </td>
                    <td className="px-8 py-6 font-bold">
                        <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-8 py-6 text-right">
                        <button className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">
                            Boost Match Prirority
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-8 bg-muted/20 border-t border-border flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium italic leading-relaxed">
                Automated Background Matching: OPAL-AI continuously scans the registered donor network for all patients in the queue. You will receive an encrypted notification as soon as a clinically compatible match (Score &gt; 85%) is detected.
            </p>
        </div>
      </div>
    </div>
  );
}
