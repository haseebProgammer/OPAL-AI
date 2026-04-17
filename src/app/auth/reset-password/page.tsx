"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Save, ShieldCheck } from "lucide-react";
import { ResetPasswordSchema, type ResetPasswordValues } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { PasswordInput } from "@/components/shared/PasswordInput";

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!token || !email) {
      toast.error("Invalid reset link. Please request a new one.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email,
          newPassword: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }
      
      toast.success("Password updated successfully!");
      router.push("/auth/login?success=password-reset");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-[#050505]">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-primary/10 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative"
      >
        <div className="glass-card p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
          
          <div className="relative z-10">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20 text-primary">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold text-white">New Password</h1>
              <p className="text-muted-foreground mt-2">
                Create a strong password to secure your account.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
              <div className="space-y-4">
                <PasswordInput
                  {...register("password")}
                  label="New Password"
                  placeholder="••••••••"
                  className="bg-white/5 border-white/10 text-white"
                />
                {errors.password && (
                  <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>
                )}

                <PasswordInput
                  {...register("confirmPassword")}
                  label="Confirm Password"
                  placeholder="••••••••"
                  className="bg-white/5 border-white/10 text-white"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 ml-1">{errors.confirmPassword.message}</p>
                )}
              </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-xl bg-primary text-white font-bold transition-all hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Set New Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
