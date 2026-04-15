"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HospitalRegistrationSchema } from "@/lib/schemas/hospital";
import { toast } from "sonner";

type HospitalRegistrationValues = z.infer<typeof HospitalRegistrationSchema>;
import {
  Building2, Mail, Lock, User, Phone, MapPin, Activity, ShieldCheck, CheckCircle, 
  ArrowRight, ArrowLeft, Loader2, ClipboardCheck, Briefcase, FileText, Globe, ShieldAlert
} from "lucide-react";

const specializations = [
  "Transplant Center", "Blood Bank", "Organ Procurement", "General Hospital",
  "Cardiology", "Neurology", "Emergency Care", "Oncology"
];

const hospitalTypes = ["Public", "Private", "NGO"];

export default function HospitalSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const checkEmailAvailability = async (email: string) => {
    if (!email || !email.includes('@')) return;
    setEmailStatus('checking');
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setEmailStatus(data.available ? 'available' : 'taken');
    } catch {
      setEmailStatus('idle');
    }
  };

  const { register, handleSubmit, trigger, formState: { errors }, watch, setValue, reset } = useForm<HospitalRegistrationValues>({
    resolver: zodResolver(HospitalRegistrationSchema) as any,
    defaultValues: {
      specialization: [],
      hospital_type: "Private",
      phone: "+92 ",
      emergency_contact: "+92 "
    }
  });

  const watchSpecialization = watch("specialization");
  const watchValues = watch();

  const toggleSpecialization = (item: string) => {
    const current = watchSpecialization || [];
    if (current.includes(item)) {
      setValue("specialization", current.filter(i => i !== item), { shouldValidate: true });
    } else {
      setValue("specialization", [...current, item], { shouldValidate: true });
    }
  };

  const processNextStep = async () => {
    let fieldsToValidate: (keyof HospitalRegistrationValues)[] = [];
    if (step === 1) fieldsToValidate = ["hospital_name", "license_number", "hospital_type", "specialization"] as (keyof HospitalRegistrationValues)[];
    if (step === 2) fieldsToValidate = ["city", "full_address", "latitude", "longitude", "phone", "emergency_contact"] as (keyof HospitalRegistrationValues)[];
    if (step === 3) fieldsToValidate = ["admin_name", "designation", "email", "password", "confirm_password"] as (keyof HospitalRegistrationValues)[];
    
    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) {
      // Block Step 3 -> 4 if email is already taken
      if (step === 3 && emailStatus === 'taken') {
        toast.error("This email is already registered. Please use a different email address.");
        return;
      }
      setStep(prev => prev + 1);
    }
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

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      if (result.success) {
        toast.success("Application submitted! Redirecting to verification center...");
        router.push("/auth/pending-approval");
      }
      reset();
    } catch (err: any) {
      console.error("HOSPITAL_SIGNUP_ERROR:", err);
      toast.error(err.message || "An unexpected error occurred during registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6 text-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
          <CheckCircle className="h-24 w-24 text-primary" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold font-display text-foreground leading-tight">
          Application <br/><span className="text-primary tracking-tight">Pending Approval</span>
        </motion.h2>
        <p className="text-muted-foreground max-w-sm font-medium leading-relaxed">
          Your hospital registration is complete. Our administration team is now verifying your healthcare license and credentials. 
        </p>
        <div className="bg-muted p-4 rounded-xl border border-border text-xs text-muted-foreground flex items-start gap-3 max-w-sm text-left line-clamp-3">
          <ShieldAlert className="h-5 w-5 text-primary shrink-0" />
          You will receive an email once your portal access is activated. This typically takes 24-48 hours.
        </div>
        <Link href="/" className="inline-flex items-center gap-2 text-primary font-bold text-sm bg-primary/5 px-6 py-3 rounded-xl border border-primary/10 hover:bg-primary/10 transition-colors">
          Return to Home Page <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background tracking-tight">
      {/* Left Sidebar Info */}
      <div className="hidden lg:flex lg:w-1/3 bg-muted/30 border-r border-border p-12 flex-col justify-between relative overflow-hidden backdrop-blur-3xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-12 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold font-display tracking-tight text-foreground">OPAL<span className="text-primary">-AI</span></span>
          </Link>
          
          <h1 className="text-4xl font-display font-bold leading-tight mb-6 text-foreground">
            Hospital <span className="text-primary">Network</span> Registration
          </h1>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
            Gain secure access to high-precision matching protocols and a verified national donor base.
          </p>

          <div className="space-y-6">
            {[ 
              { stepNum: 1, title: "Institution Info", icon: Building2 },
              { stepNum: 2, title: "Location & Contact", icon: MapPin },
              { stepNum: 3, title: "Admin Credentials", icon: Lock },
              { stepNum: 4, title: "Review & Commit", icon: ClipboardCheck }
            ].map((s) => (
              <div key={s.stepNum} className={`flex items-center gap-4 transition-all ${step === s.stepNum ? 'text-primary scale-105' : step > s.stepNum ? 'text-primary' : 'text-muted-foreground/40'}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${step === s.stepNum ? 'bg-primary/20 ring-1 ring-primary shadow-[0_0_15px_rgba(220,38,38,0.3)]' : step > s.stepNum ? 'bg-primary/10 border border-primary/20' : 'bg-muted border border-border'}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm tracking-wide uppercase">{s.title}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 p-6 rounded-2xl bg-card border border-border shadow-sm">
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            &quot;OPAL-AI has reduced our emergency cross-match time by 60%. Essential for modern organ procurement.&quot;
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-6 w-px bg-primary" />
            <span className="text-[10px] font-bold text-foreground tracking-widest uppercase">General Hospital, Islamabad</span>
          </div>
        </div>
      </div>

      {/* Right Form Area */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-12 py-12 relative overflow-y-auto">
        <div className="max-w-xl w-full mx-auto">
          
          <div className="mb-10">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-3xl font-display font-bold text-foreground tracking-tight">Step {step} <span className="text-muted-foreground text-xl ml-2">/ 4</span></h2>
              <span className="text-xs font-bold text-primary tracking-widest uppercase">
                {step === 1 && "Security & Licensing"}
                {step === 2 && "Geospatial Data"}
                {step === 3 && "Access Control"}
                {step === 4 && "Final Verification"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: `${((step - 1) / 4) * 100}%` }}
                animate={{ width: `${(step / 4) * 100}%` }}
                transition={{ duration: 0.5, ease: "circOut" }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <AnimatePresence mode="wait">
              {/* --- STEP 1: INSTITUTION --- */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground ml-1 font-display">Hospital Name</label>
                    <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input {...register("hospital_name")} type="text" placeholder="e.g. Shifa International Hospital" className="w-full bg-card border border-border rounded-xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" suppressHydrationWarning />
                    </div>
                    {errors.hospital_name && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.hospital_name.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground ml-1 text-nowrap font-display">Healthcare License #</label>
                      <div className="relative group">
                        <ClipboardCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input {...register("license_number")} type="text" placeholder="PMDC-XXXXX" className="w-full bg-card border border-border rounded-xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono" suppressHydrationWarning />
                      </div>
                      {errors.license_number && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.license_number.message}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground ml-1 font-display">Hospital Type</label>
                      <div className="relative group">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <select {...register("hospital_type")} className="w-full bg-card border border-border rounded-xl py-4 pl-12 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer" suppressHydrationWarning>
                          {hospitalTypes.map(t => <option key={t} value={t} className="bg-card text-foreground">{t}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-muted-foreground ml-1 font-display">Specialization Focus</label>
                    <div className="flex flex-wrap gap-2">
                      {specializations.map(item => {
                        const isSelected = watchSpecialization?.includes(item);
                        return (
                          <motion.button
                            key={item}
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleSpecialization(item)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-primary'}`}
                            suppressHydrationWarning
                          >
                            {item}
                          </motion.button>
                        );
                      })}
                    </div>
                    {errors.specialization && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.specialization.message}</p>}
                  </div>
                </motion.div>
              )}

              {/* --- STEP 2: LOCATION --- */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground ml-1 font-display">City</label>
                      <input {...register("city")} type="text" placeholder="e.g. Lahore" className="w-full bg-card border border-border rounded-xl py-4 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium" suppressHydrationWarning />
                      {errors.city && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.city.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground ml-1 font-display">Official Phone</label>
                      <input {...register("phone")} type="tel" placeholder="+92 3XX XXXXXXX" className="w-full bg-card border border-border rounded-xl py-4 px-4 text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" suppressHydrationWarning />
                      {errors.phone && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.phone.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground ml-1 font-display">Full Physical Address</label>
                    <textarea {...register("full_address")} rows={2} className="w-full bg-card border border-border rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none shadow-sm" />
                    {errors.full_address && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.full_address.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-primary tracking-widest uppercase">Latitude</label>
                      <input {...register("latitude")} type="number" step="any" placeholder="33.6844" className="w-full bg-white border border-border rounded-lg py-3 px-4 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm" suppressHydrationWarning />
                      {errors.latitude && <p className="text-[10px] text-red-500 font-medium">{errors.latitude.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-primary tracking-widest uppercase">Longitude</label>
                      <input {...register("longitude")} type="number" step="any" placeholder="73.0479" className="w-full bg-white border border-border rounded-lg py-3 px-4 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm" suppressHydrationWarning />
                      {errors.longitude && <p className="text-[10px] text-red-500 font-medium">{errors.longitude.message}</p>}
                    </div>
                    <p className="col-span-full text-[10px] text-muted-foreground flex items-center gap-2">
                      <Globe className="w-3 h-3 text-primary" /> These coordinates are required for high-precision AI matching distance calculations.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground ml-1 font-display">24/7 Emergency Line</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40 group-focus-within:text-primary animate-pulse" />
                      <input {...register("emergency_contact")} type="text" placeholder="Extension or Direct Line" className="w-full bg-card border border-border rounded-xl py-4 pl-12 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" suppressHydrationWarning />
                    </div>
                    {errors.emergency_contact && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.emergency_contact.message}</p>}
                  </div>
                </motion.div>
              )}

              {/* --- STEP 3: ADMIN --- */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground ml-1 font-display">Admin Name</label>
                      <input {...register("admin_name")} type="text" placeholder="Dr. Sarah Ahmed" className="w-full bg-card border border-border rounded-xl py-4 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium" suppressHydrationWarning />
                      {errors.admin_name && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.admin_name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground ml-1 font-display">Designation</label>
                      <input {...register("designation")} type="text" placeholder="Medical Director" className="w-full bg-card border border-border rounded-xl py-4 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium" suppressHydrationWarning />
                      {errors.designation && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.designation.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground ml-1 font-display">Institutional Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        {...register("email")}
                        type="email"
                        placeholder="sarah.a@hospital.org.pk"
                        onBlur={(e) => checkEmailAvailability(e.target.value)}
                        className={`w-full bg-card border rounded-xl py-4 pl-12 pr-4 text-foreground focus:outline-none focus:ring-2 transition-all ${
                          emailStatus === 'taken' ? 'border-destructive focus:ring-destructive/50' :
                          emailStatus === 'available' ? 'border-green-500 focus:ring-green-500/50' :
                          'border-border focus:ring-primary/50'
                        }`}
                        suppressHydrationWarning
                      />
                      {emailStatus === 'checking' && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                      {emailStatus === 'available' && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                      {emailStatus === 'taken' && <ShieldAlert className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />}
                    </div>
                    {emailStatus === 'taken' && (
                      <p className="text-xs text-destructive mt-1 ml-1 font-bold flex items-center gap-1">
                        ⚠ An institutional account already exists with this email. Please use a different one.
                      </p>
                    )}
                    {emailStatus === 'available' && (
                      <p className="text-xs text-green-500 mt-1 ml-1 font-bold">✓ Email is available</p>
                    )}
                    {errors.email && emailStatus === 'idle' && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.email.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground ml-1 font-display">Access Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input {...register("password")} type="password" placeholder="••••••••" className="w-full bg-card border border-border rounded-xl py-4 pl-12 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" suppressHydrationWarning />
                      </div>
                      {errors.password && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.password.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground ml-1 font-display">Confirm Password</label>
                      <input {...register("confirm_password")} type="password" placeholder="••••••••" className="w-full bg-card border border-border rounded-xl py-4 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" suppressHydrationWarning />
                      {errors.confirm_password && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.confirm_password.message}</p>}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* --- STEP 4: REVIEW --- */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  
                  <div className="rounded-2xl border border-border bg-muted/30 p-6 space-y-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2 font-display">
                      <FileText className="w-5 h-5 text-primary" /> Application Summary
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-y-4 text-sm px-2">
                      <div>
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">Institution</p>
                        <p className="text-foreground font-semibold">{watchValues.hospital_name}</p>
                        <p className="text-muted-foreground text-xs font-mono">{watchValues.license_number}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">Administrator</p>
                        <p className="text-foreground font-semibold">{watchValues.admin_name}</p>
                        <p className="text-muted-foreground text-xs font-medium">{watchValues.designation}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">Contact & Reach</p>
                        <p className="text-foreground font-semibold">{watchValues.phone}</p>
                        <p className="text-muted-foreground text-xs truncate font-medium">{watchValues.full_address}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-4 border-t border-border">
                      {watchValues.specialization?.map(s => (
                        <span key={s} className="px-2.5 py-1 rounded-md bg-white border border-border text-muted-foreground text-[10px] font-bold uppercase tracking-tighter shadow-sm">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-start gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors group">
                      <div className="relative flex items-center h-5">
                        <input {...register("confirm_accurate")} type="checkbox" className="h-5 w-5 rounded-md border-border bg-card text-primary focus:ring-primary focus:ring-offset-0" suppressHydrationWarning />
                      </div>
                      <div className="text-sm">
                        <p className="font-bold text-foreground group-hover:text-primary transition-colors">Information Accuracy</p>
                        <p className="text-xs text-muted-foreground mt-0.5">I confirm all provided hospital and licensing information is medically accurate and legally valid under national health protocols.</p>
                      </div>
                    </label>
                    {errors.confirm_accurate && <p className="text-xs text-red-500 font-bold ml-1">{errors.confirm_accurate.message}</p>}

                    <label className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors group">
                      <div className="relative flex items-center h-5">
                        <input {...register("agree_terms")} type="checkbox" className="h-5 w-5 rounded-md border-border bg-card text-primary focus:ring-primary focus:ring-offset-0" suppressHydrationWarning />
                      </div>
                      <div className="text-sm">
                        <p className="font-bold text-foreground group-hover:text-foreground/80 transition-colors">Terms of Verification</p>
                        <p className="text-xs text-muted-foreground mt-0.5">I agree to the OPAL-AI terms of service and understand that my credentials will undergo manual verification before account activation.</p>
                      </div>
                    </label>
                    {errors.agree_terms && <p className="text-xs text-red-500 font-bold ml-1">{errors.agree_terms.message}</p>}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-10 border-t border-border mt-12">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)} className="px-8 py-4 rounded-xl font-bold bg-muted text-foreground hover:bg-muted/80 transition-all flex items-center gap-3 text-sm tracking-wide border border-border" suppressHydrationWarning>
                  <ArrowLeft className="h-4 w-4" /> Go Back
                </button>
              ) : (
                <Link href="/auth/login" className="px-8 py-4 rounded-xl font-bold text-muted-foreground hover:text-foreground transition-all text-sm tracking-wide underline-offset-4 hover:underline decoration-primary">
                  Cancel Registration
                </Link>
              )}

              {step < 4 ? (
                <button type="button" onClick={processNextStep} className="px-10 py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(220,38,38,0.4)] text-sm tracking-wide active:scale-95" suppressHydrationWarning>
                  Continue Form <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={isSubmitting} className="px-10 py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all flex items-center gap-3 shadow-[0_0_25px_rgba(220,38,38,0.5)] disabled:opacity-50 text-sm tracking-wide active:scale-95 group overflow-hidden relative" suppressHydrationWarning>
                  {isSubmitting ? (
                     <><Loader2 className="h-5 w-5 animate-spin" /> Transmitting...</>
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5 group-hover:scale-125 transition-transform" /> 
                      Finalize & Submit
                    </>
                  )}
                </button>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
