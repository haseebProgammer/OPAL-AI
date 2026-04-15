"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { donorFormSchema, type DonorFormValues } from "@/lib/schemas/donor";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Heart, Mail, Lock, User, Phone, MapPin, Activity, ShieldAlert, CheckCircle, Droplet, ArrowRight, ArrowLeft, Loader2, CreditCard, ChevronDown
} from "lucide-react";

export default function DonorSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);

  const { register, handleSubmit, trigger, formState: { errors }, watch, setValue, reset } = useForm<DonorFormValues>({
    resolver: zodResolver(donorFormSchema) as any,
    defaultValues: {
      donationType: "Blood Donation Only",
      donatingItems: [],
      organsWilling: [],
      medicalConditions: "",
      contactNumber: "+92 "
    }
  });

  // Form Persistence Logic
  useEffect(() => {
    const saved = localStorage.getItem("donor-draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        reset(parsed); // Restore form values
      } catch (e) {}
    }
  }, [reset]);

  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem("donor-draft", JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const watchDonatingItems = watch("donatingItems");
  const watchDonationType = watch("donationType");
  const isOrganDonor = watchDonationType === "Organ Donation Only" || watchDonationType === "Both";
  const watchOrgansWilling = watch("organsWilling");

  const toggleDonatingItem = (item: string) => {
    const current = watchDonatingItems || [];
    if (current.includes(item)) setValue("donatingItems", current.filter(i => i !== item), { shouldValidate: true });
    else setValue("donatingItems", [...current, item], { shouldValidate: true });
  };

  const toggleOrganItem = (item: string) => {
    const current = watchOrgansWilling || [];
    if (current.includes(item)) setValue("organsWilling", current.filter(i => i !== item), { shouldValidate: true });
    else setValue("organsWilling", [...current, item], { shouldValidate: true });
  };

  const processNextStep = async () => {
    let fieldsToValidate: (keyof DonorFormValues)[] = [];
    if (step === 1) fieldsToValidate = ["donationType", "email", "password"] as (keyof DonorFormValues)[];
    if (step === 2) fieldsToValidate = ["firstName", "lastName", "age", "gender", "city", "contactNumber", "cnic"] as (keyof DonorFormValues)[];
    if (step === 3) {
      if (isOrganDonor) {
        fieldsToValidate = ["bloodType", "hepStatus", "hivStatus", "diabetes", "smoker", "height", "weight", "donorStatus", "organsWilling"] as (keyof DonorFormValues)[];
      } else {
        fieldsToValidate = ["bloodType", "hepStatus"] as (keyof DonorFormValues)[];
      }
    }
    
    const isStepValid = await trigger(fieldsToValidate as any);
    
    // Extra validation for Step 1: Check if email exists
    if (isStepValid && step === 1) {
      setIsValidatingEmail(true);
      try {
        const email = watch("email");
        const res = await fetch("/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const { exists } = await res.json();
        
        if (exists) {
          toast.error("Account already exists with this email address. Please sign in or use another email.");
          return;
        }
      } catch (err) {
        console.error("Email check failed", err);
      } finally {
        setIsValidatingEmail(false);
      }
    }

    if (isStepValid) setStep(prev => prev + 1);
  };

  const onInvalid = (errors: any) => {
    console.group("Form Validation Failed");
    console.log("Error Object:", errors);
    console.log("Failing Fields:", Object.keys(errors));
    console.groupEnd();

    const fieldNames = Object.keys(errors).join(", ");
    toast.error(`Validation failed in: ${fieldNames}. Please check those sections.`);
    
    // Auto-scroll to first error or provide more detail
    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      toast.error(`Primary Error: ${firstError.message}`);
    }
  };

  const clearDraft = () => {
    if (confirm("This will clear all filled data. Are you sure?")) {
      localStorage.removeItem("donor-draft");
      window.location.reload();
    }
  };

  const onSubmit = async (data: DonorFormValues) => {
    setIsSubmitting(true);
    try {
      // Use the new secure Backend API
      const response = await fetch("/api/auth/register-donor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to register donor");
      }
      
      if (result.success) {
        toast.success("Registration success! Redirecting to verification...");
        router.push("/auth/pending-approval");
      }
      
      localStorage.setItem("pending-verify-email", data.email);
      localStorage.removeItem("donor-draft");
      setSubmissionSuccess(true);
      
      const fullName = `${data.firstName} ${data.lastName}`;
      
      // 4. Send Welcome Email (Non-blocking)
      fetch("/api/email/welcome-donor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          name: fullName,
          bloodType: data.bloodType
        })
      }).catch(e => console.error("Welcome Email Error:", e));
      
      setTimeout(() => {
        router.push("/?registration=success");
      }, 3000);
      
    } catch (err: any) {
      toast.error(err.message || "Something went wrong during registration.");
      console.error("SIGNUP_ERROR:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 text-center p-6 bg-background">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
          <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
            <Heart className="h-16 w-16 text-primary animate-pulse" />
          </div>
        </motion.div>
        
        <div className="space-y-4 max-w-lg text-center">
          <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-display font-bold text-foreground">
            Truly <span className="text-primary">Life-Saving</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-muted-foreground text-lg leading-relaxed text-center">
            Thank you for registering. Your commitment is now live in our secure medical network. Hospitals can now find you in times of urgent need.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="p-4 rounded-2xl bg-muted/50 border border-border italic text-sm text-muted-foreground">
            &quot;One donor can save up to 8 lives.&quot;
            You&apos;ve taken the first step.
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-4 pt-8">
            <div className="flex items-center gap-2 text-primary font-bold text-sm bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Returning to home...</span>
            </div>
            <Link href="/" className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">
                Click here if not redirected automatically
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT PANEL — Cinematic Visual (Like reference image) */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between" style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a0505 40%, #2d0a0a 70%, #0a0a0a 100%)"
      }}>
        
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Large glow orb */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
            style={{ background: "radial-gradient(circle, #dc2626 0%, #7f1d1d 50%, transparent 100%)" }} />
          {/* Secondary orb */}
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full opacity-15 blur-3xl"
            style={{ background: "radial-gradient(circle, #ef4444 0%, #991b1b 60%, transparent 100%)", animation: "pulse 3s ease-in-out 1.5s infinite" }} />
          {/* Top right glow */}
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10 blur-3xl"
            style={{ background: "radial-gradient(circle, #b91c1c 0%, transparent 70%)" }} />
          
          {/* Floating particles */}
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-red-500/30 animate-bounce"
              style={{
                width: `${4 + (i % 4) * 3}px`,
                height: `${4 + (i % 4) * 3}px`,
                left: `${8 + (i * 7.5) % 85}%`,
                top: `${10 + (i * 13) % 80}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + (i % 3)}s`,
              }}
            />
          ))}

          {/* Grid lines overlay */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "linear-gradient(rgba(220,38,38,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.4) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        {/* Heartbeat Line SVG */}
        <div className="absolute bottom-1/3 left-0 right-0 opacity-20">
          <svg viewBox="0 0 400 80" className="w-full" preserveAspectRatio="none">
            <polyline
              points="0,40 40,40 60,10 75,70 90,20 110,50 140,40 200,40 220,5 235,75 250,20 270,55 290,40 400,40"
              fill="none" stroke="#dc2626" strokeWidth="2"
              style={{ strokeDasharray: 800, strokeDashoffset: 0, animation: "dash 4s linear infinite" }}
            />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 p-12 flex flex-col h-full justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Heart className="h-5 w-5 text-white fill-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">OPAL<span className="text-primary">-AI</span></span>
          </Link>

          {/* Main Text — Like "Create your Free Account" in reference */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-black uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Secure Medical Network
            </div>
            <h1 className="text-5xl font-black leading-tight text-white">
              Become a<br />
              <span className="text-primary" style={{ textShadow: "0 0 40px rgba(220,38,38,0.5)" }}>Life Saver</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Register as a verified donor and connect with hospitals that need you most — powered by AI matching.
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { value: "2 min", label: "To Register" },
                { value: "8 lives", label: "You Can Save" },
                { value: "24/7", label: "AI Matching" },
              ].map((stat) => (
                <div key={stat.value} className="text-center p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <div className="text-xl font-black text-primary">{stat.value}</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Step indicators at bottom */}
          <div className="space-y-3">
            {[
              { stepNum: 1, title: "Account Details", icon: Lock },
              { stepNum: 2, title: "Personal Info", icon: User },
              { stepNum: 3, title: "Medical Background", icon: Activity },
              { stepNum: 4, title: "Donation Preferences", icon: Heart }
            ].map((s) => (
              <div key={s.stepNum} className={`flex items-center gap-3 transition-all duration-300 ${
                step === s.stepNum ? 'opacity-100' : step > s.stepNum ? 'opacity-50' : 'opacity-20'
              }`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${
                  step === s.stepNum ? 'bg-primary shadow-lg shadow-primary/40' : 
                  step > s.stepNum ? 'bg-white/10 border border-white/20' : 'border border-white/10'
                }`}>
                  <s.icon className={`h-3.5 w-3.5 ${step === s.stepNum ? 'text-white' : 'text-white/50'}`} />
                </div>
                <span className={`text-sm font-bold ${step === s.stepNum ? 'text-white' : 'text-white/40'}`}>
                  {s.title}
                </span>
                {step > s.stepNum && (
                  <div className="ml-auto h-4 w-4 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                    <CheckCircle className="h-2.5 w-2.5 text-green-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Area */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-12 py-12 bg-background relative overflow-y-auto">
        <div className="max-w-xl w-full mx-auto">
          
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Heart className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-display tracking-tight">OPAL-AI Donor</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold">Step {step} of 4</h2>
            {/* Debug Error Display */}
            {Object.keys(errors).length > 0 && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                <p className="text-xs font-bold text-destructive uppercase tracking-widest mb-2">Missing / Invalid Fields:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(errors).map(([key, err]: [string, any]) => (
                    <li key={key} className="text-xs text-destructive">{key}: {err.message}</li>
                  ))}
                </ul>
                <button 
                  onClick={clearDraft}
                  className="mt-3 text-[10px] font-bold uppercase tracking-widest text-destructive hover:underline"
                >
                  Clear all progress & reset form
                </button>
              </div>
            )}
            <div className="h-2 w-full bg-muted rounded-full mt-4 overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: `${((step - 1) / 4) * 100}%` }}
                animate={{ width: `${(step / 4) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            <AnimatePresence mode="wait">
              {/* --- STEP 1: ACCOUNT --- */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div className="space-y-3 pb-2">
                    <label className="text-sm font-medium">Donation Type</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {["Blood Donation Only", "Organ Donation Only", "Both"].map(type => (
                        <label key={type} className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border p-4 cursor-pointer transition-all ${watchDonationType === type ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-card hover:bg-muted'}`}>
                          <input type="radio" value={type} {...register("donationType")} className="sr-only" suppressHydrationWarning />
                          <span className="text-sm font-medium text-center">{type}</span>
                        </label>
                      ))}
                    </div>
                    {errors.donationType && <p className="text-xs text-destructive">{String(errors.donationType.message)}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input {...register("email")} type="email" placeholder="you@example.com" className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" suppressHydrationWarning />
                    </div>
                    {errors.email && <p className="text-xs text-destructive">{String(errors.email.message)}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input {...register("password")} type="password" placeholder="Min. 8 characters" className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" suppressHydrationWarning />
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{String(errors.password.message)}</p>}
                  </div>
                </motion.div>
              )}

              {/* --- STEP 2: PERSONAL --- */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">First Name</label>
                      <input {...register("firstName")} type="text" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" suppressHydrationWarning />
                      {errors.firstName && <p className="text-xs text-destructive">{String(errors.firstName.message)}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last Name</label>
                      <input {...register("lastName")} type="text" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" suppressHydrationWarning />
                      {errors.lastName && <p className="text-xs text-destructive">{String(errors.lastName.message)}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Age</label>
                      <input {...register("age")} type="number" min={18} max={100} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" suppressHydrationWarning />
                      {errors.age && <p className="text-xs text-destructive">{String(errors.age.message)}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Gender</label>
                      <div className="relative">
                        <select {...register("gender")} className="w-full rounded-xl border border-border bg-card px-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer" suppressHydrationWarning>
                          <option value="">Select...</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                      {errors.gender && <p className="text-xs text-destructive">{String(errors.gender.message)}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center justify-between">
                      <span>City & Location</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          if ("geolocation" in navigator) {
                            setValue("city", "Detecting...");
                            navigator.geolocation.getCurrentPosition(async (pos) => {
                              const lat = pos.coords.latitude;
                              const lon = pos.coords.longitude;
                              setValue("latitude", lat);
                              setValue("longitude", lon);
                              
                              try {
                                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                                const data = await response.json();
                                const addr = data.address;
                                // Detect if we are in Lahore but getting localized names
                                const isLahore = Object.values(addr).some(val => String(val).toLowerCase().includes("lahore"));
                                
                                const neighborhood = addr.suburb || addr.neighborhood || addr.residential || addr.road || "";
                                let city = addr.city || addr.town || addr.municipality || addr.city_district || addr.county || "";
                                
                                if (isLahore) city = "Lahore";
                                
                                const finalLocation = neighborhood && city ? `${neighborhood}, ${city}` : neighborhood || city || "Location Detected";
                                
                                setValue("city", finalLocation, { shouldValidate: true });
                                toast.success(`Detected: ${finalLocation}`);
                              } catch (err) {
                                setValue("city", "Current Location");
                                toast.error("Reverse geocoding failed.");
                              }
                            }, (error) => {
                              toast.error("Location access denied.");
                              setValue("city", "");
                            }, { 
                              enableHighAccuracy: true, 
                              timeout: 10000, 
                              maximumAge: 0 
                            });
                          }
                        }}
                        className="text-[10px] font-bold text-primary uppercase tracking-tighter hover:underline"
                        suppressHydrationWarning
                      >
                        Auto-Detect GPS
                      </button>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input {...register("city")} type="text" placeholder="e.g. Lahore, Karachi" className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" suppressHydrationWarning />
                      <input type="hidden" {...register("latitude")} suppressHydrationWarning />
                      <input type="hidden" {...register("longitude")} suppressHydrationWarning />
                    </div>
                    {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input {...register("contactNumber")} type="tel" placeholder="+92 3XX XXXXXXX" className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" suppressHydrationWarning />
                    </div>
                    {errors.contactNumber && <p className="text-xs text-destructive">{errors.contactNumber.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">CNIC Number (Verification)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input {...register("cnic")} type="text" placeholder="XXXXX-XXXXXXX-X" className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" suppressHydrationWarning />
                    </div>
                    {errors.cnic && <p className="text-xs text-destructive">{errors.cnic.message}</p>}
                    <p className="text-[10px] text-muted-foreground italic ml-1">Example: 35201-1234567-1</p>
                  </div>
                </motion.div>
              )}

              {/* --- STEP 3: MEDICAL --- */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Blood Type</label>
                      <div className="relative">
                        <Droplet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                        <select {...register("bloodType")} className="w-full rounded-xl border border-border bg-card pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium cursor-pointer" suppressHydrationWarning>
                          <option value="">Select</option>
                          <option value="A+">A+</option><option value="A-">A-</option>
                          <option value="B+">B+</option><option value="B-">B-</option>
                          <option value="AB+">AB+</option><option value="AB-">AB-</option>
                          <option value="O+">O+</option><option value="O-">O-</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                      {errors.bloodType && <p className="text-xs text-destructive">{String(errors.bloodType.message)}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">Hepatitis Status</label>
                      <div className="relative">
                        <select {...register("hepStatus")} className="w-full rounded-xl border border-border bg-card px-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium cursor-pointer" suppressHydrationWarning>
                          <option value="">Select</option>
                          <option value="Negative">Negative</option>
                          <option value="Positive">Positive</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                      {errors.hepStatus && <p className="text-xs text-destructive">{String(errors.hepStatus.message)}</p>}
                    </div>
                  </div>

                  {isOrganDonor && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Height (cm)</label>
                          <input {...register("height")} type="number" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" suppressHydrationWarning />
                          {errors.height && <p className="text-xs text-destructive">{String(errors.height.message)}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Weight (kg)</label>
                          <input {...register("weight")} type="number" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" suppressHydrationWarning />
                          {errors.weight && <p className="text-xs text-destructive">{String(errors.weight.message)}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">HIV Status</label>
                          <select {...register("hivStatus")} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium" suppressHydrationWarning>
                            <option value="">Select</option><option value="Negative">Negative</option><option value="Positive">Positive</option>
                          </select>
                          {errors.hivStatus && <p className="text-xs text-destructive">{String(errors.hivStatus.message)}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Smoker</label>
                          <select {...register("smoker")} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium" suppressHydrationWarning>
                            <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
                          </select>
                          {errors.smoker && <p className="text-xs text-destructive">{String(errors.smoker.message)}</p>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Diabetic</label>
                        <select {...register("diabetes")} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none font-medium" suppressHydrationWarning>
                          <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
                        </select>
                        {errors.diabetes && <p className="text-xs text-destructive">{String(errors.diabetes.message)}</p>}
                      </div>

                      <div className="space-y-2 border-t border-border/50 pt-4 mt-2">
                        <label className="text-sm font-medium flex items-center justify-between">
                          <span>Organs Willing to Donate</span>
                          <span className="text-xs text-muted-foreground">Select all that apply</span>
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {["Kidney", "Liver", "Heart", "Lungs", "Corneas", "Pancreas", "Bone Marrow"].map(item => {
                            const isSelected = watchOrgansWilling?.includes(item);
                            return (
                              <div key={item} onClick={() => toggleOrganItem(item)} className={`rounded-full border px-4 py-2 text-xs cursor-pointer transition-all font-medium ${isSelected ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'border-border bg-card hover:bg-muted text-muted-foreground'}`}>
                                {item}
                              </div>
                            );
                          })}
                        </div>
                        {errors.organsWilling && <p className="text-xs text-destructive mt-1">{String(errors.organsWilling.message)}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Donor Scope</label>
                        <div className="flex gap-4 mt-1">
                          {["Living", "Posthumous"].map(status => (
                            <label key={status} className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted transition-colors">
                              <input type="radio" value={status} {...register("donorStatus")} className="accent-primary" suppressHydrationWarning />
                              <span className="text-sm">{status}</span>
                            </label>
                          ))}
                        </div>
                        {errors.donorStatus && <p className="text-xs text-destructive">{String(errors.donorStatus.message)}</p>}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Medications (Optional)</label>
                    <textarea {...register("medicalConditions")} rows={3} placeholder="Any known allergies, chronic diseases, or recent surgeries..." className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" suppressHydrationWarning />
                  </div>
                </motion.div>
              )}

              {/* --- STEP 4: DONATION PREFRENCES --- */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  
                  {watchDonationType !== "Organ Donation Only" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center justify-between">
                        <span>Blood Donation Details</span>
                        <span className="text-xs text-muted-foreground">Select all that apply</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {["Whole Blood", "Plasma", "Platelets"].map(item => {
                          const isSelected = watchDonatingItems?.includes(item);
                          return (
                            <div 
                              key={item}
                              onClick={() => toggleDonatingItem(item)}
                              className={`rounded-xl border p-4 cursor-pointer flex items-center justify-between transition-all ${isSelected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted'}`}
                            >
                              <span className="text-sm font-medium">{item}</span>
                              <div className={`h-4 w-4 rounded-full border ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                            </div>
                          );
                        })}
                      </div>
                      {errors.donatingItems && <p className="text-xs text-destructive mt-2">{String(errors.donatingItems.message)}</p>}
                    </div>
                  )}

                  {isOrganDonor && (
                    <div className="space-y-5 border-t border-border/50 pt-4 mt-2">
                      <h3 className="text-lg font-semibold font-display text-primary">Legal Consent & Next of Kin</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Next of Kin Name</label>
                          <input {...register("nextOfKinName")} type="text" placeholder="Full name" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" suppressHydrationWarning />
                          {errors.nextOfKinName && <p className="text-xs text-destructive">{String(errors.nextOfKinName.message)}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Kin Contact</label>
                          <input {...register("nextOfKinContact")} type="tel" placeholder="+92 3XX..." className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" suppressHydrationWarning />
                          {errors.nextOfKinContact && <p className="text-xs text-destructive">{String(errors.nextOfKinContact.message)}</p>}
                        </div>
                      </div>

                      <label className="flex items-start gap-3 mt-4 p-4 border border-warning/30 bg-warning/5 rounded-xl cursor-pointer hover:bg-warning/10 transition-colors">
                        <input type="checkbox" {...register("consent")} className="mt-1 h-5 w-5 rounded border-border text-primary focus:ring-primary" suppressHydrationWarning />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">I legally consent to organ donation.</span>
                          <span className="text-xs text-muted-foreground">By checking this box, I confirm that I am of legal age and making this decision voluntarily.</span>
                          {errors.consent && <p className="text-xs text-destructive mt-1 font-semibold">{String(errors.consent.message)}</p>}
                        </div>
                      </label>
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
              {step > 1 ? (
                <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-3 rounded-xl font-medium hover:bg-muted transition-colors flex items-center gap-2 text-sm" suppressHydrationWarning>
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button 
                  type="button" 
                  onClick={processNextStep} 
                  disabled={isValidatingEmail}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-primary/20 text-sm disabled:opacity-50" 
                  suppressHydrationWarning
                >
                  {isValidatingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Next Step"} <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  onClick={() => console.log("Submit button click triggered")}
                  className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-xl shadow-primary/25 disabled:opacity-50 text-sm" 
                  suppressHydrationWarning
                >
                  {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Finalizing...</> : <><Heart className="h-4 w-4" /> Complete Registration</>}
                </button>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
