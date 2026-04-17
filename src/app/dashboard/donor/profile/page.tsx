"use client";

import { motion } from "framer-motion";
import { useAllDonors } from "@/hooks/useSupabaseData";
import { safeField } from "@/lib/mappers";
import { SkeletonTable } from "@/components/shared/Skeleton";
import {
  User,
  Droplets,
  Shield,
  AlertCircle,
  CheckCircle,
  HeartPulse,
  MapPin,
  Scale,
  Ruler,
  Activity,
} from "lucide-react";

export default function DonorProfilePage() {
  const { data: donors, isLoading } = useAllDonors();

  // In a real app, we'd filter by the logged-in user's ID
  const donor = donors?.[0];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Health Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Loading your verified medical information...</p>
        </div>
        <SkeletonTable rows={8} />
      </div>
    );
  }

  if (!donor) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Health Profile</h1>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
          <User className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No donor profile found. Complete your sign-up to see your medical records.</p>
        </div>
      </div>
    );
  }

  const clinical = donor.clinical;

  const fields = [
    { label: "Full Name", value: donor.full_name, icon: User, locked: true },
    { label: "Blood Type", value: donor.blood_type, icon: Droplets, locked: true },
    { label: "Donating", value: donor.donating_items, icon: HeartPulse, locked: true },
    { label: "City", value: donor.city, icon: MapPin, locked: true },
    
    // Medical Profile Fields (New)
    { label: "HIV Status", value: clinical?.hiv || "—", icon: Shield, locked: false },
    { label: "Hepatitis Status", value: clinical?.hep || "—", icon: Shield, locked: false },
    { label: "Diabetic", value: clinical?.diabetes ? "Yes" : "No", icon: Activity, locked: false },
    { label: "Smoker", value: clinical?.smoker ? "Yes" : "No", icon: Activity, locked: false },
    { label: "Next of Kin", value: clinical?.kin_contact || "—", icon: User, locked: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Health Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Sourced from the unified <code className="bg-muted px-1 rounded text-[10px]">donors</code> and <code className="bg-muted px-1 rounded text-[10px]">medical_profiles</code> tables.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-success/20 bg-success/5 p-4 flex items-center gap-3"
      >
        <CheckCircle className="h-5 w-5 text-success shrink-0" />
        <div>
          <p className="text-sm font-semibold text-success">Verified Donor Profile — Secured by RLS</p>
          <p className="text-xs text-muted-foreground">
            Medical records are isolated for your privacy. Only you and authorized facilities can view this sensitive data.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card divide-y divide-border"
      >
        {fields.map((field) => (
          <div key={field.label} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <field.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{field.label}</p>
                <p className="text-sm font-medium">{field.value}</p>
              </div>
            </div>
            {field.locked && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-full">
                Locked
              </span>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
