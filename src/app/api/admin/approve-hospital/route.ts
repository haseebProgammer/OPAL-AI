import { createServerSupabase, getServiceSupabase } from "@/lib/supabase";
import { sendHospitalWelcomeEmail } from "@/lib/mailer";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = await createServerSupabase(cookieStore);
  const adminClient = getServiceSupabase();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const isAdmin = user?.user_metadata?.role === "admin" || user?.email === "ranahaseeb9427@gmail.com";
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const { hospital_id } = await request.json();

    if (!hospital_id) {
      return NextResponse.json({ error: "Hospital ID is required" }, { status: 400 });
    }

    // 1. Get hospital details
    const { data: hospital, error: fetchError } = await adminClient
      .from("hospitals")
      .select("email, hospital_name")
      .eq("hospital_id", hospital_id)
      .single();
    
    if (fetchError || !hospital) throw new Error("Hospital not found");

    // 2. Update verification status
    const { error: updateError } = await adminClient
      .from("hospitals")
      .update({ is_verified: true })
      .eq("hospital_id", hospital_id);

    if (updateError) throw updateError;

    // 3. Notify Hospital (Direct and Reliable)
    try {
      await sendHospitalWelcomeEmail(hospital.email, hospital.hospital_name);
    } catch (notifyError: any) {
       console.error("Database updated but welcome email failed:", notifyError);
       return NextResponse.json({ 
         success: true, 
         warning: "Hospital verified but notification email failed: " + notifyError.message 
       });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Approve Hospital API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
