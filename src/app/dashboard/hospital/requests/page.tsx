"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useRecipients, useCreateRequest } from "@/hooks/useSupabaseData";
import { mockRequests } from "@/data/mock";
import { BLOOD_TYPES, ORGAN_TYPES, URGENCY_LEVELS, CITIES } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import type { DonorRequestFormData, RequestType, UrgencyLevel } from "@/lib/types";
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  Check,
  Droplets,
  HeartPulse,
  AlertCircle,
} from "lucide-react";

const STEPS = ["Type", "Details", "Urgency", "Review"];

export default function RequestsPage() {
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<DonorRequestFormData>>({});

  const { data: recipients, isLoading: isTableLoading } = useRecipients();
  const createRequestMutation = useCreateRequest();

  const requests = (recipients || []).map((r) => ({
    id: r.id,
    type: r.required_organ === 'Whole Blood' ? 'blood' : 'organ',
    blood_type: r.blood_type,
    organ: r.required_organ,
    urgency: r.urgency_level,
    hospital: r.hospital_name,
    status: r.status,
    submitted_at: r.created_at,
    city: r.city,
  }));

  const updateField = <K extends keyof DonorRequestFormData>(key: K, val: DonorRequestFormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  const canNext = () => {
    if (step === 0) return !!formData.request_type;
    if (step === 1) return formData.request_type === "blood" ? !!formData.blood_type : !!formData.organ_type;
    if (step === 2) return !!formData.urgency && !!formData.city;
    return true;
  };

  const handleSubmit = async () => {
    try {
      await createRequestMutation.mutateAsync(formData);
      setShowForm(false);
      setStep(0);
      setFormData({});
    } catch (e) {
      // toast handled in hook
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Request Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage blood & organ donor requests
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* Multi-Step Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
              {/* Step indicator */}
              <div className="flex items-center gap-2">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        i <= step
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i < step ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-sm font-medium hidden sm:inline ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                      {s}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div className={`h-px w-8 ${i < step ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="min-h-[180px]"
                >
                  {/* Step 0: Type */}
                  {step === 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Request Type</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { type: "blood" as RequestType, icon: Droplets, label: "Blood Donation", desc: "Request blood donors by type" },
                          { type: "organ" as RequestType, icon: HeartPulse, label: "Organ Donation", desc: "Request organ donors" },
                        ].map((opt) => (
                          <button
                            key={opt.type}
                            onClick={() => updateField("request_type", opt.type)}
                            className={`group rounded-xl border p-5 text-left transition-all hover:-translate-y-0.5 ${
                              formData.request_type === opt.type
                                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                                : "border-border hover:border-primary/30"
                            }`}
                          >
                            <opt.icon className={`h-6 w-6 mb-3 ${formData.request_type === opt.type ? "text-primary" : "text-muted-foreground"}`} />
                            <p className="font-semibold">{opt.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 1: Details */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Medical Details</h3>
                      {formData.request_type === "blood" ? (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Blood Type Required</label>
                          <div className="grid grid-cols-4 gap-2">
                            {BLOOD_TYPES.map((bt) => (
                              <button
                                key={bt}
                                onClick={() => updateField("blood_type", bt)}
                                className={`rounded-lg border py-2.5 text-sm font-bold transition-all ${
                                  formData.blood_type === bt
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                {bt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Organ Type Required</label>
                          <div className="grid grid-cols-3 gap-2">
                            {ORGAN_TYPES.map((org) => (
                              <button
                                key={org.value}
                                onClick={() => updateField("organ_type", org.value)}
                                className={`rounded-lg border py-2.5 text-sm font-medium transition-all capitalize ${
                                  formData.organ_type === org.value
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                {org.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Urgency & City */}
                  {step === 2 && (
                    <div className="space-y-5">
                      <h3 className="text-lg font-semibold">Urgency & Location</h3>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Urgency Level</label>
                        <div className="grid grid-cols-3 gap-3">
                          {URGENCY_LEVELS.map((u) => (
                            <button
                              key={u.value}
                              onClick={() => updateField("urgency", u.value)}
                              className={`rounded-xl border py-3 text-sm font-semibold transition-all ${
                                formData.urgency === u.value
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border hover:border-primary/30"
                              }`}
                            >
                              <span className="mr-1">{u.emoji}</span> {u.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">City</label>
                        <select
                          value={formData.city || ""}
                          onChange={(e) => updateField("city", e.target.value)}
                          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="">Select city...</option>
                          {CITIES.map((c) => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Review */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Review Request</h3>
                      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Type</span>
                          <span className="text-sm font-medium capitalize">{formData.request_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            {formData.request_type === "blood" ? "Blood Type" : "Organ"}
                          </span>
                          <span className="text-sm font-bold text-primary">
                            {formData.blood_type || formData.organ_type}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Urgency</span>
                          <span className="text-sm font-medium capitalize">
                            {URGENCY_LEVELS.find((u) => u.value === formData.urgency)?.emoji}{" "}
                            {formData.urgency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">City</span>
                          <span className="text-sm font-medium">{formData.city}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-accent">
                        <AlertCircle className="h-4 w-4" />
                        <span>AI matching will begin immediately after submission.</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => step > 0 ? setStep(step - 1) : setShowForm(false)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {step === 0 ? "Cancel" : "Back"}
                </button>
                {step < 3 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={!canNext()}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-30"
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                  >
                    <Check className="h-4 w-4" /> Submit Request
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Requests Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            All Requests
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Requirement</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Urgency</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">City</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs">{req.id}</td>
                  <td className="px-5 py-3 capitalize font-medium">{req.type}</td>
                  <td className="px-5 py-3 font-bold text-primary">{req.blood_type || req.organ}</td>
                  <td className="px-5 py-3">
                    <span className="capitalize">
                      {URGENCY_LEVELS.find((u) => u.value === req.urgency)?.emoji} {req.urgency}
                    </span>
                  </td>
                  <td className="px-5 py-3">{req.city}</td>
                  <td className="px-5 py-3"><StatusBadge status={req.status} /></td>
                  <td className="px-5 py-3 text-muted-foreground">{timeAgo(req.submitted_at)}</td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                    No active requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
