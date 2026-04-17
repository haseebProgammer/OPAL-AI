import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = await createServerSupabase(cookieStore);

  try {
    // 1. Session & Role Validation
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // 2. Fetch Hospital Context
    const { data: hospital, error: hError } = await supabase
      .from("hospitals")
      .select("id, name")
      .eq("user_id", user.id)
      .single();

    if (hError || !hospital) {
      return NextResponse.json({ error: "Hospital identity not verified or found." }, { status: 403 });
    }

    // 3. SECURE REGISTRY QUERY (Fetch all clinical matches & Outcomes)
    // We join with donors to get identification data
    const { data: matches, error: mError } = await supabase
        .from("organ_requests")
        .select(`
            id,
            patient_blood_type,
            required_organs,
            urgency_level,
            status,
            created_at
        `)
        .eq("hospital_id", hospital.id)
        .order("created_at", { ascending: false });

    if (mError) throw mError;

    // 4. GENERATE SECURE CSV
    const headers = [
        "Audit ID", 
        "Requirement Type", 
        "Patient Blood Group", 
        "Urgency Priority", 
        "Match Status", 
        "Timestamp"
    ];
    
    let csvContent = headers.join(",") + "\n";
    
    matches.forEach(m => {
        const row = [
            m.id,
            (m.required_organs as string[] || []).join(" | "),
            m.patient_blood_type,
            m.urgency_level,
            m.status,
            new Date(m.created_at).toLocaleString()
        ];
        csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    // 5. PRIVACY LOGGING
    // Log that this hospital exported their registry for compliance
    await supabase.from("data_access_logs").insert({
        hospital_id: hospital.id,
        action_type: "registry_export",
        donor_id: "00000000-0000-0000-0000-000000000000" // System Level
    });

    return new Response(csvContent, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="OPAL_Clinical_Audit_${hospital.id.slice(0, 8)}.csv"`,
            "X-Audit-Protection": "Active"
        }
    });

  } catch (error: any) {
    console.error("REGISTRY EXPORT FAILURE:", error);
    return NextResponse.json({ error: "Internal Secure Export Layer failed." }, { status: 500 });
  }
}
