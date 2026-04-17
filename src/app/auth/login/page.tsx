"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, LogIn, AlertCircle, Heart, Building2 } from "lucide-react";
import { LoginSchema, type LoginValues } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { PasswordInput } from "@/components/shared/PasswordInput";

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
      // 1. Authenticate with Supabase
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;
      if (!authData.user) throw new Error("Authentication failed: Identity not returned.");

      // 2. Verified Role Fetching
      // We check metadata first (fastest), then fallback to Profiles (Source of Truth)
      let role = authData.user.user_metadata?.role;

      if (!role) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        if (profileError) {
          console.error("Profile Resolution Failed:", profileError);
          // Standard fallback to donor if profile is missing but user exists
          role = "donor";
        } else {
          role = profile.role;
        }
      }

      // 3. Deterministic Redirection (Master Admin Override)
      const userEmail = authData.user.email?.toLowerCase();
      const isSuperAdmin = userEmail === "ranahaseeb9427@gmail.com";
      
      toast.success("Identity verified. Redirecting...");
      
      if (isSuperAdmin) {
        router.replace("/dashboard/admin");
        return;
      }

      switch (role) {
        case "admin":
          router.replace("/dashboard/admin");
          break;
        case "hospital":
          router.replace("/dashboard/hospital");
          break;
        case "donor":
          router.replace("/dashboard/donor");
          break;
        default:
          toast.error("Account active but role is unassigned. Please contact support.");
          router.replace("/");
          break;
      }

    } catch (error: any) {
      toast.error(error.message || "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT PANEL — Shared Visual Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col bg-slate-950 items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15),transparent)] pointer-events-none" />
        <div className="relative z-10 text-center space-y-6">
           <Link href="/" className="flex items-center justify-center gap-3 mb-10">
            <Heart className="h-10 w-10 text-primary fill-primary" />
            <span className="text-3xl font-black text-white tracking-tight">OPAL<span className="text-primary">-AI</span></span>
           </Link>
           <h1 className="text-4xl font-extrabold text-white tracking-tight">Secure Portal Access</h1>
           <p className="text-slate-400 max-w-sm mx-auto">Connecting donors and healthcare providers with clinical precision.</p>
        </div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md space-y-8"
        >
          <div>
            <h2 className="text-3xl font-black tracking-tight">Sign In</h2>
            <p className="text-muted-foreground mt-2 font-medium">Enter your credentials to manage your network.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  {...register("email")}
                  placeholder="name@facility.pk"
                  suppressHydrationWarning
                  className="w-full bg-muted/40 border-border rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <PasswordInput
              {...register("password")}
              label="Password"
              placeholder="••••••••"
              suppressHydrationWarning
            />
            <div className="flex justify-end pr-1">
              <Link href="/auth/forgot-password" size="sm" className="text-xs text-primary font-bold hover:underline">Forgot Password?</Link>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}

            <button
              disabled={isLoading}
              suppressHydrationWarning
              className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Sign In <LogIn className="w-4 h-4" /></>}
            </button>

            <div className="flex flex-col gap-4 pt-4 border-t border-border">
              <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">Register New Account</p>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/auth/donor/signup" className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border hover:bg-primary/5 transition-all text-sm font-bold">
                  <Heart className="w-4 h-4 text-primary" /> Donor
                </Link>
                <Link href="/auth/hospital/signup" className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border hover:bg-primary/5 transition-all text-sm font-bold">
                  <Building2 className="w-4 h-4 text-primary" /> Hospital
                </Link>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
