"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, LogIn, ArrowRight, AlertCircle, Info, Heart, Building2 } from "lucide-react";
import { LoginSchema, type LoginValues } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    if (searchParams.get("success") === "password-reset") {
      toast.success("Password reset successful. Please login.");
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          router.push("/auth/verify-email");
          return;
        }
        throw error;
      }

      // Role check for specific redirection
      const role = authData.user?.user_metadata?.role;
      
      if (role === "admin") {
        router.replace("/dashboard/admin");
      } else if (role === "hospital") {
        router.replace("/dashboard/hospital");
      } else if (role === "donor") {
        router.replace("/dashboard/donor");
      } else {
        // Fallback — profiles table check
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user?.id)
          .single();

        if (profile?.role === "admin") {
          router.replace("/dashboard/admin");
        } else if (profile?.role === "hospital") {
          router.replace("/dashboard/hospital");
        } else {
          router.replace("/dashboard/donor");
        }
      }

      toast.success("Welcome back to OPAL-AI!");
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* LEFT PANEL — Cinematic OPAL-AI Visual */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col" style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a0505 40%, #2d0a0a 70%, #0a0a0a 100%)"
      }}>

        {/* Animated Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full opacity-25 blur-3xl animate-pulse"
            style={{ background: "radial-gradient(circle, #dc2626 0%, #7f1d1d 60%, transparent 100%)" }} />
          <div className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full opacity-15 blur-3xl"
            style={{ background: "radial-gradient(circle, #ef4444 0%, #991b1b 70%, transparent 100%)", animation: "pulse 3.5s ease-in-out 2s infinite" }} />
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-3xl"
            style={{ background: "radial-gradient(circle, #b91c1c 0%, transparent 70%)" }} />

          {/* Floating droplets */}
          {[...Array(10)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-red-500/20 animate-pulse"
              style={{
                width: `${20 + (i % 4) * 15}px`,
                height: `${20 + (i % 4) * 15}px`,
                left: `${5 + (i * 9.3) % 85}%`,
                top: `${8 + (i * 11.7) % 82}%`,
                animationDelay: `${i * 0.35}s`,
                animationDuration: `${2 + (i % 3)}s`,
                boxShadow: '0 0 10px rgba(220,38,38,0.15) inset'
              }}
            />
          ))}

          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(rgba(220,38,38,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        {/* Content */}
        <div className="relative z-10 p-12 flex flex-col h-full justify-between">
          {/* Logo top */}
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/40">
              <Heart className="h-5 w-5 text-white fill-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">OPAL<span className="text-primary">-AI</span></span>
          </Link>

          {/* Middle hero text */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-black uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Pakistan&apos;s #1 Donor Platform
            </div>

            <h1 className="text-5xl font-black leading-tight text-white">
              Welcome<br />
              <span className="text-primary" style={{ textShadow: "0 0 40px rgba(220,38,38,0.6)" }}>Back</span>
            </h1>

            <p className="text-white/60 text-lg leading-relaxed max-w-sm">
              Sign in to access real-time AI matching and your verified medical donor network.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              {["🧬 AI Powered", "🏥 Verified Network", "⚡ Real-time Matching", "🔒 Secure Medical Data"].map((f) => (
                <span key={f} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-bold">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom quote */}
          <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm space-y-3">
            <p className="text-white/60 text-sm italic leading-relaxed">
              &quot;One donor can save up to 8 lives. OPAL-AI makes every second count.&quot;
            </p>
            <div className="flex items-center gap-2">
              <div className="h-4 w-px bg-primary rounded-full" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-black">OPAL-AI Medical Team</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background relative">
        {/* Subtle bg glow */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center">
              <Heart className="h-4 w-4 text-white fill-white" />
            </div>
            <span className="text-xl font-black tracking-tight">OPAL<span className="text-primary">-AI</span></span>
          </div>

          <div className="mb-8">
            <h2 className="text-4xl font-black text-foreground tracking-tight">Sign In</h2>
            <p className="text-muted-foreground mt-2 font-medium">
              Welcome back to Asia&apos;s leading AI donor platform.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="doctor@hospital.pk"
                  className="w-full bg-muted/30 border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  suppressHydrationWarning
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 flex items-center gap-1 ml-1 font-medium">
                  <AlertCircle className="w-3 h-3" /> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-bold text-foreground">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-primary font-bold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-muted/30 border border-border rounded-xl py-3.5 pl-11 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  suppressHydrationWarning
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 flex items-center gap-1 ml-1 font-medium">
                  <AlertCircle className="w-3 h-3" /> {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-13 py-4 rounded-xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              suppressHydrationWarning
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>Sign In to Account <LogIn className="w-4 h-4" /></>
              )}
            </button>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
              <span className="relative bg-background px-3 text-[10px] text-muted-foreground uppercase tracking-widest font-bold mx-auto block text-center w-fit">
                New to OPAL-AI?
              </span>
            </div>

            {/* Register links */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/auth/donor/signup"
                className="py-3 px-4 rounded-xl bg-muted/50 border border-border text-foreground font-bold hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Heart className="w-4 h-4 text-primary" /> Become Donor
              </Link>
              <Link
                href="/auth/hospital/signup"
                className="py-3 px-4 rounded-xl bg-muted/50 border border-border text-foreground font-bold hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Building2 className="w-4 h-4 text-primary" /> Hospital Portal
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
