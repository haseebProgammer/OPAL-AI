import { createServerSupabase, getServiceSupabase } from "@/lib/supabase";
import { sendApprovalEmail } from "@/lib/mailer";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = await createServerSupabase(cookieStore);
  const adminClient = getServiceSupabase();

  try {
    // 1. Authorization & Role Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Access Denied: Administrative Session Required" }, { status: 403 });
    }

    const { user_id, user_type, email, name } = await request.json();

    if (!user_id || !user_type) {
      return NextResponse.json({ error: "Payload Error: Target Identity missing." }, { status: 400 });
    }

    // 2. Clinical Activation Logic
    // Standardize: Hospitals and Donors are now both in unified paths
    const table = (user_type === 'hospital') ? 'hospitals' : 'donors';
    
    // Update Specialized Table with Production Status
    const { error: tableError } = await adminClient
      .from(table)
      .update({ 
          approval_status: 'verified',
          is_active: true, // PRODUCTION REQUIREMENT: Enable Login
          updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id); 

    if (tableError) throw new Error(`Database Update Failed: ${tableError.message}`);

    // Sync Account Role in Profiles
    const targetRole = user_type === 'hospital' ? 'hospital' : 'donor';
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ 
          role: targetRole,
          is_active: true 
      })
      .eq('id', user_id);

    if (profileError) throw profileError;

    // Sync Auth Metadata for Session Integrity
    const { error: authError } = await adminClient.auth.admin.updateUserById(user_id, {
      user_metadata: {
        role: targetRole,
        approval_status: 'verified',
        is_verified: true
      }
    });

    if (authError) throw authError;

    // 3. Automated Post-Approval Notification (Resend SDK)
    try {
      if (email) {
        await sendApprovalEmail(email, user_type.replace('_', ' '));
        console.log(`[MAIL] Activation notice sent to ${email}`);
      }
    } catch (mailError) {
      console.error("Warning: Activation successful but email notification failed.", mailError);
    }

    return NextResponse.json({ 
      success: true, 
      message: `${user_type.toUpperCase()} successfully activated in the production network.`
    });

  } catch (error: any) {
    console.error("ADMIN APPROVAL FAILURE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
