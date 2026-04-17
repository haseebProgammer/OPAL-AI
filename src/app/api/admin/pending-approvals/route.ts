import { NextResponse } from "next/server";
import { createServerSupabase, getServiceSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = await createServerSupabase(cookieStore);
  const adminClient = getServiceSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email?.toLowerCase();
  const isAdmin = user?.user_metadata?.role === "admin" || userEmail === "ranahaseeb9427@gmail.com";

  if (!isAdmin) {
    return NextResponse.json({ error: "Access Denied: Administrative Session Not Detected" }, { status: 403 });
  }

  try {
    // Phase 1: Fetch from Unified Registry & Hospitals
    const [donorRes, hospitalRes] = await Promise.all([
      adminClient
        .from("donors")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false }),
      adminClient
        .from("hospitals")
        .select("*")
        .eq("approval_status", "pending") // Standardized column name
        .order("created_at", { ascending: false })
    ]);

    // Phase 2: Normalization Pipeline
    const normalizedDonors = (donorRes.data || []).map(d => ({
      id: d.id,
      user_id: d.user_id,
      full_name: d.full_name,
      email: d.email || "—",
      city: d.city,
      type: d.donor_type,
      user_type: d.donor_type === 'organ' ? 'organ_donor' : 'blood_donor',
      detail: d.donor_type === 'organ' 
        ? `Organs: ${Array.isArray(d.organs_available) ? d.organs_available.join(', ') : 'Pending'}` 
        : `Blood: ${d.blood_type}`,
      created_at: d.created_at,
      cnic: d.cnic,
      blood_type: d.blood_type
    }));

    const normalizedHospitals = (hospitalRes.data || []).map(h => ({
      id: h.id,
      user_id: h.user_id,
      full_name: h.name, 
      email: h.contact_email || "—",
      city: h.city,
      type: "hospital",
      user_type: "hospital",
      detail: `License: ${h.license_number || "PENDING"}`,
      license_number: h.license_number,
      created_at: h.created_at,
    }));

    const finalQueue = [...normalizedDonors, ...normalizedHospitals].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json(finalQueue, { status: 200 });
  } catch (error: any) {
    console.error("ADMIN QUEUE FETCH FAILURE:", error);
    return NextResponse.json({ error: "Internal System Audit failed to fetch queue." }, { status: 500 });
  }
}
