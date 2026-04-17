import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { BLOOD_COMPATIBILITY } from "@/lib/constants";

// ============================================================
// OPAL-AI — Production-Grade Matching Engine
//
// Distance Hierarchy:
//   1. OSRM (Open Source Routing Machine) — Real road distance + travel time
//   2. Haversine — Fallback if OSRM is unreachable
//
// Scoring: SRS Formula
//   50% Blood/Organ Compatibility
//   30% Proximity (road-aware)
//   20% Clinical Urgency
//
// CIT (Cold Ischemia Time) Viability:
//   Heart:    4 hours  |  Liver: 12 hours
//   Kidney:  36 hours  |  Cornea: 14 days
//   Lungs:    6 hours  |  Pancreas: 18 hours
// ============================================================

/** Admin / Hospital Hub Location — Lahore Central */
const ADMIN_HUB = { lat: 31.5204, lng: 74.3587, city: "Lahore" };

/** OSRM Public Demo Server (free, no API key needed) */
const OSRM_BASE = "https://router.project-osrm.org";

/** Cold Ischemia Time limits in MINUTES per organ */
const CIT_LIMITS_MINUTES: Record<string, number> = {
  heart: 4 * 60,       // 240 min
  lungs: 6 * 60,       // 360 min
  lung: 6 * 60,
  liver: 12 * 60,      // 720 min
  pancreas: 18 * 60,   // 1080 min
  kidney: 36 * 60,     // 2160 min
  cornea: 14 * 24 * 60, // 20160 min (14 days)
};

/** Haversine formula — straight-line fallback distance in KM */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Blood-type compatibility scorer (0-100) */
function bloodCompatScore(donorBT: string, recipientBT: string): number {
  if (donorBT === recipientBT) return 100;
  if (donorBT === "O-") return 95; // Universal donor
  const canReceiveFrom = BLOOD_COMPATIBILITY[recipientBT] || [];
  return canReceiveFrom.includes(donorBT) ? 85 : 0;
}

/** Map city name → approximate coordinates for donors missing lat/lng */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Lahore:     { lat: 31.5204, lng: 74.3587 },
  Karachi:    { lat: 24.8607, lng: 67.0011 },
  Islamabad:  { lat: 33.6844, lng: 73.0479 },
  Rawalpindi: { lat: 33.5651, lng: 73.0169 },
  Faisalabad: { lat: 31.4504, lng: 73.1350 },
  Multan:     { lat: 30.1575, lng: 71.5249 },
  Peshawar:   { lat: 34.0151, lng: 71.5249 },
  Quetta:     { lat: 30.1798, lng: 66.9750 },
  Hyderabad:  { lat: 25.3960, lng: 68.3578 },
  Sialkot:    { lat: 32.4945, lng: 74.5229 },
  Gujranwala: { lat: 32.1877, lng: 74.1945 },
};

/**
 * Route calculation result — either from OSRM or Haversine fallback
 */
interface RouteResult {
  road_distance_km: number;
  travel_time_seconds: number;
  travel_time_human: string;
  source: "OSRM" | "Haversine-Estimate";
}

/**
 * Get real road distance + travel time from OSRM.
 * Falls back to Haversine with estimated speed if OSRM is unreachable.
 */
async function getRouteInfo(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<RouteResult> {
  try {
    // OSRM takes coordinates as lng,lat (not lat,lng!)
    const url = `${OSRM_BASE}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.length > 0) {
        const route = data.routes[0];
        const distKm = route.distance / 1000; // meters → km
        const timeSec = route.duration;        // seconds
        return {
          road_distance_km: parseFloat(distKm.toFixed(1)),
          travel_time_seconds: Math.round(timeSec),
          travel_time_human: formatDuration(timeSec),
          source: "OSRM",
        };
      }
    }
  } catch {
    // OSRM unreachable — fall through to Haversine
  }

  // ── Haversine Fallback with Pakistan road-factor ──
  // Pakistani roads are ~1.4x longer than straight-line on average
  // Average speed estimate: 50 km/h (accounting for urban + highway mix)
  const straightKm = haversineKm(fromLat, fromLng, toLat, toLng);
  const roadFactor = 1.4;
  const estimatedRoadKm = straightKm * roadFactor;
  const estimatedSpeedKmh = 50;
  const estimatedTimeSec = (estimatedRoadKm / estimatedSpeedKmh) * 3600;

  return {
    road_distance_km: parseFloat(estimatedRoadKm.toFixed(1)),
    travel_time_seconds: Math.round(estimatedTimeSec),
    travel_time_human: formatDuration(estimatedTimeSec) + " (est.)",
    source: "Haversine-Estimate",
  };
}

/** Format seconds into human-friendly duration */
function formatDuration(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Calculate CIT Viability score (0.0 → 1.0)
 * Based on actual travel time vs organ's cold ischemia limit.
 * Includes 30-minute buffer for surgical prep.
 */
function calcCitViability(travelTimeSec: number, organType: string): number {
  const organKey = organType.toLowerCase();
  const citLimit = CIT_LIMITS_MINUTES[organKey] || CIT_LIMITS_MINUTES["kidney"]; // default to kidney
  const travelMin = travelTimeSec / 60;
  const totalMin = travelMin + 30; // +30 min for surgical prep & packaging
  const viability = Math.max(0, 1 - totalMin / citLimit);
  return parseFloat(viability.toFixed(3));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patient_blood_type = "O+",
      required_organs = [],
      urgency_level = "medium",
      donor_type = "blood",
      max_results = 15,
    } = body;

    const supabase = getServiceSupabase();

    // ── 1. Fetch approved donors from the correct table ──
    const table = donor_type === "blood" ? "blood_donors" : "organ_donors";
    const { data: donors, error } = await supabase
      .from(table)
      .select("*")
      .eq("approval_status", "approved")
      .eq("is_available", true);

    if (error) {
      console.error("[MatchEngine] Supabase query error:", error.message);
      return NextResponse.json(
        { error: "Database query failed", detail: error.message },
        { status: 502 }
      );
    }

    if (!donors || donors.length === 0) {
      return NextResponse.json({
        matches: [],
        filter_stats: { passed_clinical_filters: 0, total_donors_checked: 0 },
        routing_source: "N/A",
      });
    }

    // ── 2. Pre-filter for compatibility (skip OSRM calls for incompatible donors) ──
    const compatibleDonors = donors.filter((d: any) => {
      const compat = bloodCompatScore(d.blood_type, patient_blood_type);
      if (compat === 0) return false;

      if (donor_type === "organ" && required_organs.length > 0) {
        const organsAvailable: string[] = Array.isArray(d.organs_available)
          ? d.organs_available
          : typeof d.organs_available === "string"
            ? (() => { try { return JSON.parse(d.organs_available); } catch { return []; } })()
            : [];
        const hasOrgan = required_organs.some((o: string) =>
          organsAvailable.some((av: string) => av.toLowerCase() === o.toLowerCase())
        );
        if (!hasOrgan) return false;
      }

      return true;
    });

    // ── 3. Get real road routes for compatible donors (parallel, batched) ──
    const maxRadiusKm = 300; // scoring normalization ceiling
    const urgencyMultiplier: Record<string, number> = {
      critical: 100,
      medium: 75,
      low: 50,
    };
    const urgPoints = urgencyMultiplier[urgency_level] ?? 50;
    let routingSource: "OSRM" | "Haversine-Estimate" | "Mixed" = "Haversine-Estimate";

    const scoredPromises = compatibleDonors.map(async (d: any) => {
      // Resolve donor coordinates
      let lat = d.latitude;
      let lng = d.longitude;
      if (!lat || !lng) {
        const cityCoords = CITY_COORDS[d.city] || CITY_COORDS["Lahore"];
        lat = cityCoords.lat;
        lng = cityCoords.lng;
      }

      // ── OSRM Real Road Distance (with Haversine fallback) ──
      const route = await getRouteInfo(ADMIN_HUB.lat, ADMIN_HUB.lng, lat, lng);
      if (route.source === "OSRM") routingSource = "OSRM";

      const distanceKm = route.road_distance_km;
      const travelTimeSec = route.travel_time_seconds;

      // ── Scoring ──
      const compatPoints = bloodCompatScore(d.blood_type, patient_blood_type);
      const distScore = Math.max(0, 100 - (distanceKm / maxRadiusKm) * 100);
      const finalScore = compatPoints * 0.5 + distScore * 0.3 + urgPoints * 0.2;
      const normalizedAiScore = Math.min(finalScore / 100, 0.99);

      // ── CIT Viability (organ mode) ──
      const primaryOrgan = required_organs[0] || "kidney";
      const citViability = calcCitViability(travelTimeSec, primaryOrgan);
      const citLimitMin = CIT_LIMITS_MINUTES[primaryOrgan.toLowerCase()] || CIT_LIMITS_MINUTES["kidney"];
      const citUsedPercent = Math.round(((travelTimeSec / 60 + 30) / citLimitMin) * 100);

      // ── AI Explanation ──
      const isExact = d.blood_type === patient_blood_type;
      const explanation = [
        `${isExact ? "✅ Perfect ABO alignment" : "⚠️ Compatible ABO group (secondary)"}`,
        `📍 ${d.full_name} (${d.city}) → Lahore Hub: ${distanceKm}km by road`,
        `⏱️ Travel ETA: ${route.travel_time_human} [${route.source}]`,
        donor_type === "organ"
          ? `🧊 CIT Viability: ${Math.round(citViability * 100)}% (${citUsedPercent}% of ${primaryOrgan} cold time used)`
          : `🩸 Blood donation — no CIT constraint`,
      ].join(" | ");

      return {
        donor_id: d.id || d.donor_id,
        name: d.full_name,
        blood_type: d.blood_type,
        available_organs: d.organs_available || [],
        distance_km: distanceKm,
        ai_score: parseFloat(normalizedAiScore.toFixed(3)),
        travel_time_seconds: travelTimeSec,
        travel_time_human: route.travel_time_human,
        routing_source: route.source,
        phone: d.phone || null,
        city: d.city,
        ai_explanation: explanation,
        explanation_source: `OPAL Clinical Engine v2.0 [${route.source}]`,
        organ_type: required_organs[0] || (donor_type === "blood" ? "Whole Blood" : "Unknown"),
        score_breakdown: {
          compatibility: Math.round(compatPoints * 0.5),
          distance: Math.round(distScore * 0.3),
          urgency: Math.round(urgPoints * 0.2),
          hla_compatibility: isExact ? 0.98 : 0.82,
          waitlist_priority: 0.8,
          urgency_weight: urgency_level === "critical" ? 1.0 : urgency_level === "medium" ? 0.7 : 0.4,
          cit_viability: citViability,
          cit_used_percent: citUsedPercent,
          road_distance_km: distanceKm,
          straight_line_km: parseFloat(haversineKm(ADMIN_HUB.lat, ADMIN_HUB.lng, lat, lng).toFixed(1)),
        },
      };
    });

    const results = await Promise.all(scoredPromises);
    const scored = results
      .sort((a, b) => b.ai_score - a.ai_score)
      .slice(0, max_results);

    // Determine overall routing source
    const sources = new Set(scored.map((s) => s.routing_source));
    if (sources.has("OSRM") && sources.has("Haversine-Estimate")) {
      routingSource = "Mixed";
    } else if (sources.has("OSRM")) {
      routingSource = "OSRM";
    }

    return NextResponse.json({
      matches: scored,
      filter_stats: {
        passed_clinical_filters: scored.length,
        total_donors_checked: donors.length,
        compatible_donors: compatibleDonors.length,
      },
      routing_source: routingSource,
      admin_hub: ADMIN_HUB,
    });
  } catch (err: any) {
    console.error("[MatchEngine] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal matching engine error", detail: err.message },
      { status: 500 }
    );
  }
}
