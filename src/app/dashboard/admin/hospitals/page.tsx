"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Ban, Trash2, Eye, X, ShieldCheck, Phone, Mail, MapPin, Activity } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Hospital } from "@/lib/types";

export default function AdminHospitalsPage() {
  const { data: allHospitals, refetch: refetchHospitals, isLoading } = useQuery<Hospital[]>({
    queryKey: ['admin_all_hospitals'],
    queryFn: async () => {
      const res = await fetch('/api/admin/hospitals');
      if (!res.ok) throw new Error("Failed to fetch hospitals");
      return await res.json();
    },
    refetchInterval: 15000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedHospital, setSelectedHospital] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const verifiedHospitals = allHospitals?.filter(h => h.is_verified) || [];

  // Filter Logic
  const filteredHospitals = verifiedHospitals.filter(h => {
    const matchesSearch = h.hospital_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          h.license_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === "all" || h.city?.toLowerCase() === selectedCity.toLowerCase();
    return matchesSearch && matchesCity;
  });

  const allCities = Array.from(new Set(verifiedHospitals.map(h => h.city).filter(Boolean)));

  const toggleHospitalVerification = async (id: string, current: boolean) => {
    setIsActionLoading(id);
    try {
      const res = await fetch("/api/admin/toggle-hospital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospital_id: id, suspend: current }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Action failed");
      toast.success(current ? "Hospital suspended successfully" : "Hospital reinstated successfully");
      refetchHospitals();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Remove this hospital permanently?")) return;
    setIsActionLoading(id);
    try {
      const res = await fetch("/api/admin/reject-hospital", {
        method: "POST",
        body: JSON.stringify({ hospital_id: id }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      toast.success("Hospital removed");
      refetchHospitals();
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
          <h1 className="text-3xl font-black font-display tracking-tight text-foreground">Verified <span className="text-primary">Facilities</span></h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage and monitor {filteredHospitals.length} active medical nodes.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search name or license..."
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
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hospital Name</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">City</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">License</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right mr-4">Master Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredHospitals.map((h, i) => (
                <motion.tr 
                  key={h.id} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-6 py-5 font-bold text-sm text-foreground">{h.hospital_name}</td>
                  <td className="px-6 py-5 text-xs font-bold text-muted-foreground">{h.city}</td>
                  <td className="px-6 py-5 text-xs font-mono font-bold text-primary">{h.license_number}</td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 pr-2">
                       <button 
                         onClick={() => { setSelectedHospital(h); setIsModalOpen(true); }}
                         className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-lg"
                         title="View Dossier"
                       >
                         <Eye className="w-4 h-4" />
                       </button>
                       <button 
                        onClick={() => toggleHospitalVerification(h.id, true)}
                        disabled={isActionLoading === h.id}
                        className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50" 
                        title="Suspend License"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleReject(h.id)}
                        disabled={isActionLoading === h.id}
                        className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all disabled:opacity-50" 
                        title="Purge Node"
                      >
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

      {/* Details Modal */}
      <AnimatePresence>
        {isModalOpen && selectedHospital && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-background/80 backdrop-blur-md" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="relative w-full max-w-xl bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <Building2 className="h-8 w-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black font-display text-foreground">{selectedHospital.hospital_name}</h2>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">Verified Medical Node</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Legal Credentials</p>
                          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <ShieldCheck className="h-4 w-4 text-primary" /> {selectedHospital.license_number}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-2 font-bold uppercase">Admin: {selectedHospital.admin_name || 'N/A'}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Category</p>
                          <div className="flex items-center gap-2 text-sm font-bold text-foreground capitalize">
                            <Activity className="h-4 w-4 text-primary" /> {selectedHospital.hospital_type}
                          </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Geospatial</p>
                          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <MapPin className="h-4 w-4 text-primary" /> {selectedHospital.city}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{selectedHospital.full_address || "N/A"}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Live Status</p>
                          <div className="flex items-center gap-2 text-xs font-bold text-success">
                            <div className="h-2 w-2 rounded-full bg-success animate-pulse" /> Node Operational
                          </div>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => setIsModalOpen(false)}
                    className="w-full py-4 bg-muted border border-border text-foreground rounded-2xl font-bold text-sm hover:bg-muted/80 transition-all uppercase tracking-widest"
                >
                    Close Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
