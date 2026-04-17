"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Save, 
  Activity, 
  Heart, 
  AlertCircle, 
  ShieldAlert,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface EditProfileModalProps {
  donor: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditProfileModal({ donor, isOpen, onClose, onUpdate }: EditProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: donor.full_name || "",
    phone: donor.phone || "",
    is_available: donor.is_available,
    hypertension: donor.hypertension || false,
    diabetic_status: donor.diabetic_status || false,
    heart_disease: donor.heart_disease || false,
    hepatitis_status: donor.hepatitis_status || "Negative"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/donor/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error("Failed to update profile");
      
      toast.success("Profile Updated! Review required for medical changes.");
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg glass-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden bg-background"
          >
            <div className="p-8 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Heart className="h-6 w-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black font-display uppercase tracking-tight">Clinical Profile</h3>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Post-Registration Update</p>
                 </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">Legal Name</label>
                  <input 
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-1">Contact No</label>
                  <input 
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] border-b border-primary/10 pb-2">Medical Disclosures</h4>
                 
                 <div className="space-y-3">
                    {[
                      { key: 'hypertension', label: 'Hypertension / BP History', icon: Activity },
                      { key: 'diabetic_status', label: 'Diabetes (Type I/II)', icon: AlertCircle },
                      { key: 'heart_disease', label: 'Heart Conditions', icon: Heart }
                    ].map((item) => (
                      <label key={item.key} className="flex items-center justify-between p-4 rounded-2xl border border-border hover:bg-muted/30 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-bold">{item.label}</span>
                        </div>
                        <input 
                          type="checkbox"
                          checked={(formData as any)[item.key]}
                          onChange={(e) => setFormData({...formData, [item.key]: e.target.checked})}
                          className="h-5 w-5 accent-primary rounded-lg"
                        />
                      </label>
                    ))}
                 </div>
              </div>

              <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    Updating medical details will set your account to **Pending** status. A Medical Reviewer must sign-off on your changes before they go live.
                  </p>
              </div>

              <div className="flex gap-3 pt-2">
                 <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl bg-muted text-[10px] font-black uppercase tracking-widest hover:bg-muted/80 transition-all"
                 >
                   Discard
                 </button>
                 <button 
                  disabled={loading}
                  className="flex-[2] py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                   Sync Profile Changes
                 </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
