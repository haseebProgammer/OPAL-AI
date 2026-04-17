import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await req.json();

    // Standardize update to the unified 'donors' table
    const { data, error } = await supabase
      .from("donors")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        // Security: Ensure users can't verify themselves
        approval_status: 'pending' // Re-verification required if medical data changes
      })
      .eq("user_id", user.id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Profile Update Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
