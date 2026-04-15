import { NextResponse } from "next/server";
import { createServerSupabase, getServiceSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = await createServerSupabase(cookieStore);
  const adminClient = getServiceSupabase();

  // Auth check — only admin can access
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin =
    user?.user_metadata?.role === "admin" ||
    user?.email === "ranahaseeb9427@gmail.com";

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Fetch pending blood donors
    const { data: bloodDonors } = await adminClient
      .from("blood_donors")
      .select("id, full_name, blood_type, city, created_at, approval_status, user_id, email")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });

    // Fetch pending organ donors
    const { data: organDonors } = await adminClient
      .from("organ_donors")
      .select("id, full_name, blood_type, city, created_at, approval_status, user_id, email")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });

    // Fetch pending hospitals
    const { data: hospitals } = await adminClient
      .from("hospitals")
      .select("id, hospital_name, city, created_at, approval_status, user_id, admin_name, license_number")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });

    // Normalize into one unified list
    const combined = [
      ...(bloodDonors || []).map(d => ({
        id: d.id,
        user_id: d.user_id,
        full_name: d.full_name,
        email: d.email,
        city: d.city,
        detail: `Blood Type: ${d.blood_type}`,
        user_type: "blood_donor",
        created_at: d.created_at,
        approval_status: d.approval_status,
      })),
      ...(organDonors || []).map(d => ({
        id: d.id,
        user_id: d.user_id,
        full_name: d.full_name,
        email: d.email,
        city: d.city,
        detail: `Blood Type: ${d.blood_type}`,
        user_type: "organ_donor",
        created_at: d.created_at,
        approval_status: d.approval_status,
      })),
      ...(hospitals || []).map(h => ({
        id: h.id,
        user_id: h.user_id,
        full_name: h.hospital_name,
        email: `Admin: ${h.admin_name || "N/A"}`,
        city: h.city,
        detail: `License: ${h.license_number || "N/A"}`,
        user_type: "hospital",
        created_at: h.created_at,
        approval_status: h.approval_status,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(combined, { status: 200 });
  } catch (error: any) {
    console.error("pending-approvals error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
