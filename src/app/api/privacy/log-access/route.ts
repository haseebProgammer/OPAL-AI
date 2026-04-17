import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = await createServerSupabase(cookieStore);

  try {
    const { donor_id, action } = await req.json();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Fetch Hospital ID
    const { data: hospital } = await supabase
      .from("hospitals")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!hospital) return NextResponse.json({ error: "Hospital not found" }, { status: 404 });

    // 2. Insert Privacy Audit Log
    const { data: logEntry, error: logError } = await supabase
      .from("data_access_logs")
      .insert({
        hospital_id: hospital.id,
        donor_id,
        action_type: action || "reveal_contact"
      })
      .select("id")
      .single();

    if (logError) throw logError;

    return NextResponse.json({ 
      success: true, 
      log_id: logEntry.id.split('-')[0].toUpperCase() 
    });

  } catch (error: any) {
    console.error("Privacy Log Error:", error);
    return NextResponse.json({ error: "Compliance systems offline" }, { status: 500 });
  }
}
