import { createServerSupabase } from "@/lib/supabase";
import { sendHospitalRejectionEmail } from "@/lib/mailer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { hospital_id } = await request.json();

    if (!hospital_id) {
      return NextResponse.json({ error: "Hospital ID is required" }, { status: 400 });
    }

    // 1. Get details first
    const { data: hospital, error: fetchError } = await supabase
      .from("hospitals")
      .select("email, hospital_name")
      .eq("hospital_id", hospital_id)
      .single();

    if (fetchError || !hospital) throw new Error("Hospital not found");

    // 2. Delete record
    const { error: deleteError } = await supabase
      .from("hospitals")
      .delete()
      .eq("hospital_id", hospital_id);

    if (deleteError) throw deleteError;

    // 3. Notify (Reliable email)
    try {
      await sendHospitalRejectionEmail(
        hospital.email, 
        hospital.hospital_name, 
        "The institutional license or credentials provided could not be verified by our medical board."
      );
    } catch (e: any) {
      console.error("DB update worked but rejection email failed:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
