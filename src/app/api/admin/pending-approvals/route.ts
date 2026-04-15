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
    // Fetch pending donors from central table
    const { data: pendingDonors, error: dError } = await adminClient
      .from("donors")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    // Fetch pending hospitals
    const { data: hospitals, error: hError } = await adminClient
      .from("hospitals")
      .select("*")
      .eq("is_verified", false)
      .order("created_at", { ascending: false });

    if (dError) console.error("Donors Fetch Error:", dError);
    if (hError) console.error("Hospitals Fetch Error:", hError);

    // Normalize into one unified list
    const combined = [
      ...(pendingDonors || []).map(d => ({
        id: d.id,
        user_id: d.user_id,
        full_name: `${d.first_name} ${d.last_name}`,
        email: d.email || "---",
        city: d.city,
        detail: `Type: ${d.is_blood_donor ? 'Blood' : ''}${d.is_blood_donor && d.is_organ_donor ? ' & ' : ''}${d.is_organ_donor ? 'Organ' : ''}`,
        user_type: d.is_blood_donor ? "blood_donor" : "organ_donor",
        created_at: d.created_at,
        approval_status: "pending",
        blood_type: d.blood_type,
        is_organ_donor: d.is_organ_donor,
        cnic: d.cnic || d.id_card_number,
        age: d.age,
        gender: d.gender,
      })),
      ...(hospitals || []).map(h => ({
        id: h.id,
        user_id: h.user_id,
        full_name: h.hospital_name,
        hospital_name: h.hospital_name, 
        admin_name: h.admin_name,
        email: h.contact_email || h.admin_email,
        city: h.city,
        full_address: h.full_address,
        license_number: h.license_number,
        hospital_type: h.hospital_type,
        detail: `License: ${h.license_number || "N/A"}`,
        user_type: "hospital",
        created_at: h.created_at,
        approval_status: "pending",
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(combined, { status: 200 });
  } catch (error: any) {
    console.error("pending-approvals error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
