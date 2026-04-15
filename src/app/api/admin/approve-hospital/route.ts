import { createServerSupabase, getServiceSupabase } from "@/lib/supabase";
import { sendApprovalEmail } from "@/lib/mailer";
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

    const { user_id, user_type, email, name } = await request.json();

    if (!user_id || !user_type) {
      return NextResponse.json({ error: "User ID and Type are required" }, { status: 400 });
    }

    // 1. Determine target table
    const table = user_type === 'hospital' 
      ? 'hospitals' 
      : (user_type === 'blood_donor' ? 'blood_donors' : 'organ_donors');
    
    const idKey = user_type === 'hospital' ? 'id' : 'donor_id';

    // 2. Update status in Database
    const { error: updateError } = await adminClient
      .from(table)
      .update({ 
        approval_status: 'approved',
        is_verified: true, // Legacy support
        approved_at: new Date().toISOString()
      })
      .eq(idKey, user_id);

    if (updateError) throw updateError;

    // 3. Send Success Email
    try {
      await sendApprovalEmail(email, user_type.replace('_', ' '));
    } catch (emailError) {
      console.error("User approved but email failed:", emailError);
      return NextResponse.json({ 
        success: true, 
        warning: "User approved in DB but notification email failed." 
      });
    }

    return NextResponse.json({ success: true, message: `${user_type} approved successfully.` });
  } catch (error: any) {
    console.error("ADMIN APPROVAL ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
