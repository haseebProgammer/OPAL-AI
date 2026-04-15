"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  X, 
  Building2, 
  UserCircle2, 
  ShieldCheck, 
  Mail, 
  MapPin, 
  Activity,
  Eye,
  Phone,
  Calendar,
  ClipboardList,
  Heart
} from "lucide-react";
import { toast } from "sonner";
import { useHospitals, useAllDonors } from "@/hooks/useSupabaseData";
import { mockHospitals, mockDonors } from "@/data/mock";
import { Hospital, Donor } from "@/lib/types";

export default function AdminApprovalsPage() {
  const [tab, setTab] = useState<"hospitals" | "donors">("hospitals");
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch unified pending approvals from API
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/pending-approvals");
      const data = await res.json();
      setPendingApprovals(data);
    } catch (e) {
      toast.error("Failed to sync verification queue.");
    } finally {
      setIsLoading(false);
    }
  };

  useState(() => {
    fetchPending();
  });

  // Filter Logic
  const allFiltered = pendingApprovals.filter(item => {
    const matchesSearch = item.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.id?.includes(searchQuery);
    const matchesCity = selectedCity === "all" || item.city?.toLowerCase() === selectedCity.toLowerCase();
    const matchesTab = tab === "hospitals" ? item.user_type === 'hospital' : (item.user_type === 'blood_donor' || item.user_type === 'organ_donor');
    return matchesSearch && matchesCity && matchesTab;
  });

  const allCities = Array.from(new Set(pendingApprovals.map(p => p.city).filter(Boolean)));

  const handleApprove = async (item: any) => {
    setIsActionLoading(item.id);
    
    try {
      const res = await fetch("/api/admin/approve-hospital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: item.user_id, 
          user_type: item.user_type,
          email: item.email || item.contact_email,
          name: item.full_name || item.hospital_name
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve");
      }
      toast.success(`${item.user_type === 'hospital' ? 'Hospital' : 'Donor'} authorized successfully.`);
      fetchPending();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject and remove this application?")) return;
    setIsActionLoading(id);
    try {
      const res = await fetch("/api/admin/reject-hospital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospital_id: id }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      toast.success("Application rejected and removed.");
      fetchPending();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsActionLoading(null);
    }
  };


  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Verification Queue</h1>
          <p className="text-muted-foreground mt-2 font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Active Oversight & Node Authorization
          </p>
        </div>

        {/* Dynamic Controls */}
        <div className="flex flex-wrap items-center gap-4">
            <div className="relative group">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 bg-muted/40 border border-border rounded-2xl text-sm focus:ring-4 focus:ring-primary/10 outline-none w-64 transition-all"
                />
            </div>
            
            <select 
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-4 py-3 bg-muted/40 border border-border rounded-2xl text-sm focus:ring-4 focus:ring-primary/10 outline-none appearance-none cursor-pointer hover:bg-muted font-bold min-w-[140px]"
            >
                <option value="all">All Locations</option>
                {allCities.map(city => (
                    <option key={city as string} value={city as string}>{city as string}</option>
                ))}
            </select>

            <div className="flex bg-muted/50 p-1 rounded-2xl border border-border">
                <button 
                onClick={() => setTab("hospitals")}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${tab === "hospitals" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted"}`}
                >
                <Building2 className="h-4 w-4" /> Hospitals
                </button>
                <button 
                onClick={() => setTab("donors")}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${tab === "donors" ? "bg-red-500 text-white shadow-lg shadow-red-500/10" : "text-muted-foreground hover:bg-muted"}`}
                >
                <UserCircle2 className="h-4 w-4" /> Donors
                </button>
            </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="glass-card rounded-3xl border border-border overflow-hidden shadow-2xl bg-white/5 backdrop-blur-2xl"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Entity Identity</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Credentials</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Origin</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right mr-4">Master Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {allFiltered.map((item, i) => (
                    <motion.tr key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all ${item.user_type === 'hospital' ? 'bg-primary/10 text-primary border-primary/20 group-hover:bg-primary group-hover:text-white' : 'bg-red-500/10 text-red-500 border-red-500/20 group-hover:bg-red-500 group-hover:text-white'}`}>
                            {item.user_type === 'hospital' ? <Building2 className="h-5 w-5" /> : <UserCircle2 className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">{item.full_name || item.hospital_name}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono uppercase tracking-tighter">APP-ID: {(item.id || 'unkn').slice(0,8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {item.user_type === 'hospital' ? (
                          <>
                            <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
                              <ShieldCheck className="h-4 w-4 text-primary" /> {item.license_number}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Mail className="h-3 w-3" /> {item.email || item.contact_email}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs font-mono font-bold text-foreground">{item.cnic}</div>
                            <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 font-bold"><Activity className="h-3 w-3" /> Identity Check Pending</div>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <MapPin className="h-4 w-4 text-muted-foreground" /> {item.city}
                        </div>
                        {item.user_type !== 'hospital' && <div className="text-[9px] font-black text-primary uppercase mt-1 tracking-widest">{item.blood_type} Type</div>}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 pr-2">
                           <button 
                             onClick={() => { setSelectedEntity(item); setIsModalOpen(true); }}
                             className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/10"
                             title="View Details"
                           >
                            <Eye className="h-5 w-5" />
                           </button>
                           <button onClick={() => handleApprove(item)} disabled={isActionLoading === item.id} className="h-9 w-9 rounded-xl bg-success/20 text-success flex items-center justify-center hover:bg-success hover:text-white transition-all shadow-lg shadow-success/10 disabled:opacity-50">
                            {isActionLoading === item.id ? <Activity className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                           </button>
                           <button onClick={() => handleReject(item.id)} disabled={isActionLoading === item.id} className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-lg shadow-destructive/10 disabled:opacity-50">
                            <X className="h-5 w-5" />
                           </button>
                        </div>
                      </td>
                    </motion.tr>
                ))}

                {allFiltered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                        <ShieldCheck className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No Records Found</p>
                      <p className="text-xs text-muted-foreground/50 mt-1">Try adjusting your filters or search query.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {isModalOpen && selectedEntity && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-background/80 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      {tab === "hospitals" ? <Building2 className="h-8 w-8" /> : <UserCircle2 className="h-8 w-8" />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black font-display text-foreground">{selectedEntity.full_name}</h2>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">Institutional Verification Audit</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {tab === "hospitals" ? (
                    <>
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Legal Credentials</p>
                          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <ShieldCheck className="h-4 w-4 text-primary" /> {selectedEntity.license_number}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-2 font-bold uppercase">Administrator: {selectedEntity.admin_name || 'N/A'}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Facility Contact</p>
                          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <Phone className="h-4 w-4 text-primary" /> {selectedEntity.contact_phone || "N/A"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                             <Mail className="h-3 w-3" /> {selectedEntity.email || selectedEntity.contact_email || "N/A"}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Geospatial Mapping</p>
                          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <MapPin className="h-4 w-4 text-primary" /> {selectedEntity.city}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{selectedEntity.full_address || "Address details not provided"}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Registration Status</p>
                          <div className="flex items-center gap-2 text-xs font-bold text-warning">
                            <Activity className="h-4 w-4" /> Pending Oversight
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2 uppercase font-bold tracking-tighter">Registered: {new Date(selectedEntity.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                       <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Donor Identity</p>
                          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <ShieldCheck className="h-4 w-4 text-primary" /> CNIC: {selectedEntity.cnic}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 font-medium">
                             <Calendar className="h-3 w-3" /> {selectedEntity.age} Years • {selectedEntity.gender}
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Medical Profile</p>
                          <div className="flex items-center gap-2 text-sm font-black text-primary">
                            <Heart className="h-4 w-4" /> Blood: {selectedEntity.blood_type}
                          </div>
                          <p className="text-[10px] font-bold text-success uppercase mt-2">{selectedEntity.donating_items}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">History & Flags</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-foreground">
                             HIV: <span className={selectedEntity.medical?.hiv_status === 'Negative' ? 'text-green-500' : 'text-amber-500'}>{selectedEntity.medical?.hiv_status || "Pending Lab"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-foreground mt-1">
                             HEPATITIS: <span className={selectedEntity.medical?.hepatitis_status === 'Negative' ? 'text-green-500' : 'text-amber-500'}>{selectedEntity.medical?.hepatitis_status || "Pending Lab"}</span>
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                           <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-2">Legal Consent</p>
                           <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                              <ClipboardList className="h-4 w-4 text-primary" /> Digital Affidavit Signed
                           </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => { 
                        handleApprove(selectedEntity); 
                        setIsModalOpen(false); 
                      }} 
                      className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <Check className="h-5 w-5" /> Confirm & Authorize Node
                    </button>
                   <button 
                     onClick={() => setIsModalOpen(false)}
                     className="px-8 py-4 bg-muted border border-border text-foreground rounded-2xl font-bold text-sm hover:bg-muted/80 transition-all"
                   >
                     Close Audit
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
