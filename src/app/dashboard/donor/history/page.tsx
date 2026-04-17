"use client";

import { motion } from "framer-motion";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Droplets, HeartPulse, Calendar, MapPin, History } from "lucide-react";
import { useMatchResults, useBloodDonors } from "@/hooks/useSupabaseData";
import { SkeletonRow } from "@/components/shared/Skeleton";

export default function DonorHistoryPage() {
  const { data: matches, isLoading: matchesLoading } = useMatchResults();
  const { data: donors, isLoading: donorsLoading } = useBloodDonors();

  const isLoading = matchesLoading || donorsLoading;

  // Simulate auth by grabbing the first donor in the system
  const currentDonorId = donors?.[0]?.id;

  // Filter match results where status is completed or approved for this specific donor
  const donations = (matches || [])
    .filter(
      (m: any) =>
        m.donor_id === currentDonorId &&
        (m.status === "completed" || m.status === "approved")
    )
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Donation History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Loading your donation timeline...</p>
        </div>
        <div className="space-y-4">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Donation History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your past donations and their impact
        </p>
      </div>

      {donations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
          <History className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-sm text-muted-foreground">No completed donations on record yet.</p>
        </div>
      ) : (
        /* Timeline */
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[23px] top-6 bottom-6 w-px bg-border" />

          {donations.map((donation: any, i: number) => (
            <motion.div
              key={donation.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative flex gap-4 pb-8"
            >
              {/* Dot */}
              <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card border border-border shadow-sm">
                {donation.organ_type ? (
                  <HeartPulse className="h-5 w-5 text-accent" />
                ) : (
                  <Droplets className="h-5 w-5 text-primary" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm capitalize">
                      {donation.organ_type ? "Organ" : "Blood"} Donation
                    </p>
                    <p className="text-xs text-muted-foreground">{donation.hospital_name || '—'}</p>
                  </div>
                  <StatusBadge status={donation.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(donation.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Distance: {donation.distance_km}km
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
