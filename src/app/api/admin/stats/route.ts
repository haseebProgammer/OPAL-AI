import { createServerSupabase, getServiceSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = await createServerSupabase(cookieStore);
  const adminClient = getServiceSupabase();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email?.toLowerCase();
    const isAdmin = user?.user_metadata?.role === "admin" || userEmail === "ranahaseeb9427@gmail.com";
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Unified Stats Logic
    const [donorsTotal, donorsPending, hospitalTotal, hospitalPending, matchesCount] = await Promise.all([
      adminClient.from("donors").select("*", { count: "exact", head: true }),
      adminClient.from("donors").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
      adminClient.from("hospitals").select("*", { count: "exact", head: true }),
      adminClient.from("hospitals").select("*", { count: "exact", head: true }).eq("is_verified", false),
      adminClient.from("match_results").select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      totalDonors: donorsTotal.count || 0,
      totalHospitals: hospitalTotal.count || 0,
      pendingApprovals: (donorsPending.count || 0) + (hospitalPending.count || 0),
      totalMatches: matchesCount.count || 0,
    });
  } catch (error: any) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
