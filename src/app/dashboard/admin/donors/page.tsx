"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  ToggleLeft, 
  ToggleRight, 
  Trash2, 
  Eye, 
  X, 
  ShieldCheck, 
  Phone, 
  CreditCard, 
  MapPin, 
  User,
  Activity,
  Droplet,
  AlertTriangle,
  Send,
  Loader2,
  Search,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Donor } from "@/lib/types";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function AdminDonorsPage() {
  const router = useRouter();
  
  // 1. ALL State Hooks (MUST be at the very top)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [suspendingDonor, setSuspendingDonor] = useState<{id: string, type: string, currentStatus: boolean} | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [isSubmittingReason, setIsSubmittingReason] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedBlood, setSelectedBlood] = useState("all");

  // 2. Data Fetching Hooks
  const { data, refetch: refetchDonors } = useQuery({
    queryKey: ['admin_all_donors'],
    queryFn: async () => {
      const res = await fetch('/api/admin/donors');
      if (!res.ok) throw new Error("Failed to fetch donor list");
      return await res.json();
    },
    refetchInterval: 15000, 
    enabled: !!isAuthorized
  });

  // 3. Effect Hooks
  useEffect(() => {
    async function verifyIdentity() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email?.toLowerCase();
        const isMasterAdmin = userEmail === "ranahaseeb9427@gmail.com";
        const isRoleAdmin = user?.user_metadata?.role === "admin";
        
        setIsAuthorized(isMasterAdmin || isRoleAdmin);
      } catch (err) {
        setIsAuthorized(false);
      }
    }
    verifyIdentity();
  }, []);

  // 4. Early Returns (ONLY after all hooks)
  if (isAuthorized === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <ShieldCheck className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold uppercase">Restricted Access</h2>
        <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-muted rounded-xl text-xs font-bold uppercase transition-all">Return</button>
      </div>
    );
  }

  if (isAuthorized === null) return (
    <div className="flex items-center justify-center h-[70vh]">
      <Loader2 className="h-10 w-10 text-primary animate-spin" />
    </div>
  );

  // 5. Data Processing Logic
  const bloodDonors = data?.bloodDonors;
  const organDonors = data?.organDonors;
  const refetchBlood = refetchDonors;
  const refetchOrgan = refetchDonors;

  const toggleDonorStatus = async (id: string, type: 'blood' | 'organ', current: boolean, reason?: string) => {
    try {
      const res = await fetch("/api/admin/toggle-donor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donor_id: id, type, current_status: current, reason }),
      });
      
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || "Toggle failed");
      
      toast.success(current ? "Donor suspended successfully" : "Donor re-activated successfully");

      if (result.warning) {
        toast.warning("Status updated but email notification failed.");
      }

      refetchDonors();
      setSuspendingDonor(null);
      setSuspensionReason("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleClick = (id: string, type: 'blood' | 'organ', current: boolean) => {
    if (current) {
        setSuspendingDonor({ id, type, currentStatus: current });
    } else {
        toggleDonorStatus(id, type, current);
    }
  };

  const combinedDonors = [
    ...(bloodDonors || []).map((d: any) => ({ ...d, type: 'blood' as const })),
    ...(organDonors || []).map((d: any) => ({ ...d, type: 'organ' as const }))
  ].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Filter Logic
  const filteredDonors = combinedDonors.filter(d => {
    const matchesSearch = d.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.id?.includes(searchQuery) || 
                          d.cnic?.includes(searchQuery);
    const matchesCity = selectedCity === "all" || d.city?.toLowerCase() === selectedCity.toLowerCase();
    const matchesBlood = selectedBlood === "all" || d.blood_type === selectedBlood;
    return matchesSearch && matchesCity && matchesBlood;
  });

  const allCities = Array.from(new Set(combinedDonors.map(d => d.city).filter(Boolean)));
  const allBloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-foreground">Donor Directory</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> {filteredDonors.length} Verified Nodes Online
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search name, CNIC or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl text-sm focus:ring-4 focus:ring-primary/10 outline-none w-64 transition-all"
                />
            </div>
            
            <select 
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-4 py-2.5 bg-muted/20 border border-border rounded-xl text-sm focus:ring-4 focus:ring-primary/10 outline-none appearance-none cursor-pointer hover:bg-muted font-bold min-w-[140px]"
            >
                <option value="all">All Cities</option>
                {allCities.map(city => (
                    <option key={city as string} value={city as string}>{city as string}</option>
                ))}
            </select>

            <select 
                value={selectedBlood}
                onChange={(e) => setSelectedBlood(e.target.value)}
                className="px-4 py-2.5 bg-muted/20 border border-border rounded-xl text-sm focus:ring-4 focus:ring-primary/10 outline-none appearance-none cursor-pointer hover:bg-muted font-bold"
            >
                <option value="all">All Blood Groups</option>
                {allBloodTypes.map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                ))}
            </select>
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-border shadow-2xl shadow-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Donor Identity</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">CNIC / ID</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Blood</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Platform Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredDonors.map((d, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={d.id} 
                  className="hover:bg-primary/[0.02] transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="h-9 w-9 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                          <User className="h-4 w-4" />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-foreground">{d.full_name}</p>
                          <p className="text-[10px] font-medium text-muted-foreground">{d.city}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-bold text-foreground bg-muted/50 px-2 py-0.5 rounded-md inline-block">{(d as any).cnic || (d as any).id_card_number || "---"}</p>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">ID: {d.id.slice(0, 8)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      d.type === 'blood' 
                        ? 'bg-red-500/5 text-red-500 border-red-500/20' 
                        : 'bg-indigo-500/5 text-indigo-500 border-indigo-500/20'
                    }`}>
                      {d.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <Droplet className="h-3.5 w-3.5 text-primary" />
                       <span className="text-sm font-black text-primary">{d.blood_type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
                       <Phone className="h-3 w-3" />
                       {(d as any).contact_number || (d as any).phone || "---"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => handleToggleClick(d.id, d.type, d.is_available)}
                        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          d.is_available ? 'text-green-500' : 'text-muted-foreground opacity-50'
                        }`}
                      >
                        {d.is_available ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        {d.is_available ? "Active" : "Suspended"}
                      </button>
                      {d.suspension_reason && !d.is_available && (
                         <p className="text-[8px] text-destructive font-bold truncate max-w-[100px]" title={d.suspension_reason}>
                           Reason: {d.suspension_reason}
                         </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                       <button 
                         onClick={() => setSelectedDonor(d)}
                         className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                         title="Verify Details"
                       >
                         <Eye className="w-4 h-4" />
                       </button>
                       <button className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all shadow-sm">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- DONOR DETAIL OVERLAY --- */}
      <AnimatePresence>
        {selectedDonor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               onClick={() => setSelectedDonor(null)}
               className="absolute inset-0 bg-background/80 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl glass-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden"
            >
               {/* Modal Header */}
               <div className="p-8 border-b border-border bg-muted/30 flex justify-between items-start">
                  <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-3xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
                       <User className="h-8 w-8" />
                    </div>
                    <div>
                       <h2 className="text-2xl font-black font-display tracking-tight">{selectedDonor.full_name}</h2>
                       <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-foreground text-background">
                            ID: {selectedDonor.id.slice(0, 8)}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3 text-primary" /> {selectedDonor.city}
                          </span>
                       </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDonor(null)}
                    className="p-2 bg-muted hover:bg-background rounded-xl border border-border transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
               </div>

               {/* Modal Content */}
               <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-6">
                    <div>
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Identity Verification</h4>
                       <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                             <span className="text-xs font-bold text-muted-foreground">CNIC Number</span>
                             <span className="text-sm font-mono font-bold text-foreground">{(selectedDonor as any).cnic || (selectedDonor as any).id_card_number || "---"}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                             <span className="text-xs font-bold text-muted-foreground">Contact Num</span>
                             <span className="text-sm font-bold text-foreground">{(selectedDonor as any).contact_number || (selectedDonor as any).phone || "---"}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                             <span className="text-xs font-bold text-muted-foreground">Blood Type</span>
                             <span className="text-sm font-black text-primary">{selectedDonor.blood_type}</span>
                          </div>
                       </div>
                    </div>

                    {(selectedDonor as any).suspension_reason && (
                      <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
                         <h5 className="text-[9px] font-black text-destructive uppercase mb-1">Administrative Suspension Reason</h5>
                         <p className="text-xs font-medium text-foreground italic leading-relaxed">
                            &quot;{(selectedDonor as any).suspension_reason}&quot;
                         </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-muted/30 border border-border flex items-start gap-4">
                       <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                       <div>
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-foreground">Personnel Check</h5>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                             Health profile synchronization is {selectedDonor.is_available ? "Active" : "Halted"}. AI Matching is currently scanning this donor.
                          </p>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="p-8 border-t border-border bg-muted/20 flex gap-4">
                  <button 
                    onClick={() => {
                        handleToggleClick(selectedDonor.id, (selectedDonor as any).type as any, selectedDonor.is_available);
                        setSelectedDonor(null);
                    }}
                    className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                      selectedDonor.is_available ? 'bg-destructive text-white shadow-lg shadow-destructive/20' : 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                    }`}
                  >
                    {selectedDonor.is_available ? "Suspend Donor" : "Re-Activate Donor"}
                  </button>
                  <button 
                    onClick={() => setSelectedDonor(null)}
                    className="px-8 py-4 rounded-2xl bg-card border border-border text-foreground font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-muted"
                  >
                    Dismiss
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SUSPENSION REASON MODAL --- */}
      <AnimatePresence>
        {suspendingDonor && (
           <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSuspendingDonor(null)} className="absolute inset-0 bg-background/60 backdrop-blur-md" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md glass-card rounded-[2rem] border border-border p-8 shadow-2xl">
                <div className="flex items-center gap-3 text-destructive mb-6">
                   <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5" />
                   </div>
                   <div>
                      <h3 className="text-lg font-black font-display tracking-tight">Suspension Reason</h3>
                      <p className="text-[10px] text-muted-foreground uppercase font-black">Mandatory Administrative Note</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <p className="text-sm text-muted-foreground leading-relaxed">
                      Please specify why this donor is being suspended. This reason will be visible to other administrators and potentially the donor.
                   </p>
                   <textarea 
                     value={suspensionReason}
                     onChange={(e) => setSuspensionReason(e.target.value)}
                     placeholder="e.g. Incomplete medical records, forged CNIC verification, protocol violation..."
                     className="w-full h-32 rounded-2xl bg-muted/30 border border-border p-4 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50 transition-all resize-none"
                   />
                </div>

                <div className="flex gap-3 mt-8">
                   <button 
                     disabled={!suspensionReason || isSubmittingReason}
                     onClick={async () => {
                        setIsSubmittingReason(true);
                        await toggleDonorStatus(suspendingDonor.id, suspendingDonor.type as any, suspendingDonor.currentStatus, suspensionReason);
                        setIsSubmittingReason(false);
                     }}
                     className="flex-1 py-4 bg-destructive text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {isSubmittingReason ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Commit Suspension</>}
                   </button>
                   <button onClick={() => setSuspendingDonor(null)} className="px-6 py-4 bg-muted rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-muted/80 transition-all border border-border">
                     Cancel
                   </button>
                </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
