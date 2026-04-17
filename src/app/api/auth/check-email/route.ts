import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const adminSupabase = getServiceSupabase();
    const { data: existingUsersData } = await adminSupabase.auth.admin.listUsers();
    
    const exists = existingUsersData?.users.some(u => u.email?.toLowerCase() === email.toLowerCase());

    return NextResponse.json({ exists });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
