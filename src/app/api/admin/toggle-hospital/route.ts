import { createServerSupabase, getServiceSupabase } from "@/lib/supabase";
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { hospital_id, suspend } = await request.json();

    if (!hospital_id) {
      return NextResponse.json({ error: "hospital_id is required" }, { status: 400 });
    }

    // Toggle is_verified in hospitals table using the hospital's own id (not user_id)
    const { error } = await adminClient
      .from("hospitals")
      .update({ is_verified: !suspend })
      .eq("id", hospital_id);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: suspend ? "Hospital suspended successfully." : "Hospital reinstated successfully." 
    });

  } catch (error: any) {
    console.error("TOGGLE HOSPITAL ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
