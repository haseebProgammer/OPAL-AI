import { createServerSupabase, getServiceSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = await createServerSupabase(cookieStore);
  const adminClient = getServiceSupabase();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if the user is an admin
    const isAdmin = user?.user_metadata?.role === "admin" || user?.email === "ranahaseeb9427@gmail.com";
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access. Admins only." }, { status: 403 });
    }

    // Fetch from central donors table which has CNIC
    const { data: allDonors, error: donorError } = await adminClient
      .from("donors")
      .select("*")
      .order("created_at", { ascending: false });

    if (donorError) throw donorError;

    // Filter into categories expected by the UI
    const bloodDonors = allDonors?.filter(d => d.is_blood_donor) || [];
    const organDonors = allDonors?.filter(d => d.is_organ_donor) || [];

    // Map fields to match UI expectations (full_name, is_available etc)
    const mapDonor = (d: any) => ({
      ...d,
      full_name: `${d.first_name} ${d.last_name}`,
      is_available: d.status === 'active' || d.status === 'verified',
    });

    return NextResponse.json({
      bloodDonors: bloodDonors.map(mapDonor),
      organDonors: organDonors.map(mapDonor),
    });

  } catch (error: any) {
    console.error("Admin Donors API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
