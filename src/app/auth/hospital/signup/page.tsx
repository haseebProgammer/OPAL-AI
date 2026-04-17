"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { hospitalFormSchema, type HospitalRegistrationValues } from "@/lib/schemas/hospital";
import { toast } from "sonner";
import {
  Building2, Mail, Lock, Phone, MapPin, Activity, ShieldCheck, CheckCircle, 
  ArrowRight, ArrowLeft, Loader2, ClipboardCheck, Briefcase, FileText, Globe, ShieldAlert
} from "lucide-react";
import { PasswordInput } from "@/components/shared/PasswordInput";

export default function HospitalSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, trigger, formState: { errors }, watch, reset } = useForm<HospitalRegistrationValues>({
    resolver: zodResolver(hospitalFormSchema),
    defaultValues: {
      hospital_type: "Private",
    }
  });

  const watchValues = watch();

  const processNextStep = async () => {
    let fields: any[] = [];
    if (step === 1) fields = ["name", "license_number", "hospital_type", "specialization"];
    if (step === 2) fields = ["city", "full_address", "latitude", "longitude", "contact_phone"];
    if (step === 3) fields = ["admin_name", "designation", "contact_email", "password", "confirmPassword"];
    
    const isValid = await trigger(fields);
    if (isValid) setStep(prev => prev + 1);
  };

  const onSubmit = async (data: HospitalRegistrationValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register-hospital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Registration failed");

      toast.success("Identity submitted for clinical verification.");
      router.push("/auth/pending-approval");
      reset();
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* LEFT PANEL — Branding */}
      <div className="hidden lg:flex lg:w-[40%] relative overflow-hidden flex-col justify-between bg-slate-950 p-12">
        <div className="relative z-10 space-y-8">
          <Link href="/" className="flex items-center gap-3">
            <Building2 className="h-10 w-10 text-primary" />
            <span className="text-2xl font-black text-white">OPAL<span className="text-primary">-AI</span></span>
          </Link>
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-white leading-tight">Join the Clinical Network</h1>
            <p className="text-slate-400 text-lg">Access Pakistan&apos;s most advanced AI matching engine for organ and blood procurement.</p>
          </div>
        </div>
        
        <div className="relative z-10 space-y-4">
           { [1, 2, 3, 4].map((s) => (
             <div key={s} className={`flex items-center gap-4 transition-all ${step === s ? 'opacity-100 scale-105' : 'opacity-40'}`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold ${step === s ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400'}`}>{s}</div>
                <span className="text-sm font-bold text-white uppercase tracking-widest">
                  {s === 1 && "Institution Info"}
                  {s === 2 && "Location Details"}
                  {s === 3 && "Administrator"}
                  {s === 4 && "Final Review"}
                </span>
             </div>
           ))}
        </div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-20 py-12 overflow-y-auto">
        <div className="max-w-xl w-full mx-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <h2 className="text-3xl font-black tracking-tight mb-8">Hospital Identity</h2>
                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1">Registered Hospital Name</label>
                    <input {...register("name")} placeholder="e.g. Mayo Hospital" className="w-full bg-muted/40 border-border rounded-xl py-4 px-5 outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                    {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-sm font-bold ml-1">License Number</label>
                       <input {...register("license_number")} placeholder="PHC-XXXXX" className="w-full bg-muted/40 border-border rounded-xl py-4 px-5 outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-bold ml-1">Type</label>
                       <select {...register("hospital_type")} className="w-full bg-muted/40 border-border rounded-xl py-4 px-5 outline-none focus:ring-2 focus:ring-primary/50 transition-all">
                          <option value="Public">Public</option>
                          <option value="Private">Private</option>
                          <option value="NGO">Non-Profit</option>
                       </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1">Primary Specialization</label>
                    <input {...register("specialization")} placeholder="e.g. Multi-organ Transplant" className="w-full bg-muted/40 border-border rounded-xl py-4 px-5 outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <h2 className="text-3xl font-black tracking-tight mb-8">Clinical Location</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold ml-1">City</label>
                      <input {...register("city")} placeholder="Lahore" className="w-full bg-muted/40 border-border rounded-xl py-4 px-5 outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold ml-1">Contact Phone</label>
                      <input {...register("contact_phone")} placeholder="+92 ..." className="w-full bg-muted/40 border-border rounded-xl py-4 px-5 outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1">Full Physical Address</label>
                    <textarea {...register("full_address")} rows={3} className="w-full bg-muted/40 border-border rounded-xl py-4 px-5 outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none" />
                  </div>
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-4">
                    <div className="flex-1 space-y-1">
                       <label className="text-[10px] font-black uppercase text-primary">Lat</label>
                       <input type="number" step="any" {...register("latitude")} className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-mono" />
                    </div>
                    <div className="flex-1 space-y-1">
                       <label className="text-[10px] font-black uppercase text-primary">Lng</label>
                       <input type="number" step="any" {...register("longitude")} className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-mono" />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                   <h2 className="text-3xl font-black tracking-tight mb-8">Administrator Control</h2>
                   <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold ml-1">Admin Name</label>
                      <input {...register("admin_name")} placeholder="Full Name" className="w-full bg-muted/40 border-border rounded-xl py-4 px-5 outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold ml-1">Designation</label>
                      <input {...register("designation")} placeholder="Medical Supt." className="w-full bg-muted/40 border-border rounded-xl py-4 px-5 outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                    </div>
                  </div>
                   <div className="space-y-2">
                    <label className="text-sm font-bold ml-1">Official Email</label>
                    <input {...register("contact_email")} type="email" placeholder="admin@hospital.org" className="w-full bg-muted/40 border-border rounded-xl py-4 px-5 outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <PasswordInput
                      {...register("password")}
                      label="Password"
                      placeholder="••••••••"
                    />
                    <PasswordInput
                      {...register("confirmPassword")}
                      label="Confirm Password"
                      placeholder="••••••••"
                    />
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                   <h2 className="text-3xl font-black tracking-tight mb-8">Review Application</h2>
                   <div className="bg-muted/30 p-6 rounded-2xl border border-border space-y-4">
                      <div className="flex justify-between border-b border-border pb-2">
                         <span className="text-xs font-bold text-muted-foreground uppercase">Institution</span>
                         <span className="text-sm font-bold">{watchValues.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-2">
                         <span className="text-xs font-bold text-muted-foreground uppercase">License</span>
                         <span className="text-sm font-bold">{watchValues.license_number}</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-2">
                         <span className="text-xs font-bold text-muted-foreground uppercase">Admin</span>
                         <span className="text-sm font-bold">{watchValues.admin_name}</span>
                      </div>
                   </div>
                   <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <p className="text-xs text-primary font-bold">Verification Notice:</p>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">Registration will be reviewed by OPAL-AI clinical auditors before portal access is granted.</p>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between items-center pt-8 border-t border-border mt-10">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-4 rounded-xl font-black uppercase text-xs tracking-widest bg-muted hover:bg-muted/80 transition-all">Back</button>
              ) : (
                <Link href="/auth/login" className="text-xs font-black uppercase text-muted-foreground hover:text-primary transition-all tracking-widest">Login Instead</Link>
              )}

              {step < 4 ? (
                <button type="button" onClick={processNextStep} className="px-10 py-4 rounded-xl bg-primary text-white font-black uppercase text-xs tracking-widest hover:brightness-110 transition-all flex items-center gap-2">
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={isSubmitting} className="px-10 py-4 rounded-xl bg-primary text-white font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Application"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
