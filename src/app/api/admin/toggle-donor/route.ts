import { getServiceSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  const adminClient = getServiceSupabase();

  try {
    const { donor_id, type, current_status, reason } = await request.json();

    if (!donor_id) {
      return NextResponse.json({ error: "Donor ID is required" }, { status: 400 });
    }

    const typeToTable: Record<string, string> = {
      blood: "blood_donors",
      organ: "organ_donors",
    };

    let tableName = typeToTable[type] || "blood_donors";
    const nextStatus = !current_status;

    // 0. Fetch donor details (Try specialized first)
    let { data: donor } = await adminClient
      .from(tableName)
      .select("*") 
      .eq("id", donor_id)
      .maybeSingle();

    // FALLBACK 1: Check the other specialized table
    if (!donor) {
      const otherTable = tableName === "blood_donors" ? "organ_donors" : "blood_donors";
      const { data: fallbackDonor } = await adminClient
        .from(otherTable)
        .select("*")
        .eq("id", donor_id)
        .maybeSingle();
      
      if (fallbackDonor) {
        donor = fallbackDonor;
        tableName = otherTable;
      }
    }

    // FALLBACK 2: Check the main 'donors' table
    if (!donor) {
      const { data: centralDonor } = await adminClient
        .from("donors")
        .select("*")
        .eq("id", donor_id)
        .maybeSingle();
      
      if (centralDonor) {
        donor = centralDonor;
        tableName = "donors";
      }
    }

    if (!donor) {
      throw new Error(`Critical Error: Node [${donor_id}] is missing from all clinical registries.`);
    }

    // Prepare update data
    const updateData: any = {
      status: nextStatus ? 'active' : 'suspended',
      suspension_reason: nextStatus ? null : (reason || "Administrative Review")
    };

    if (tableName !== "donors") {
      updateData.is_available = nextStatus;
    }

    // 1. Update the table where the donor was found
    const { error: specErr } = await adminClient
      .from(tableName)
      .update(updateData)
      .eq("id", donor_id);

    if (specErr) throw specErr;

    // 2. FORCE SYNC: Update the unified 'donors' table as well
    await adminClient.from("donors").update({
      status: nextStatus ? 'active' : 'suspended',
      suspension_reason: nextStatus ? null : (reason || "Administrative Review")
    }).eq("id", donor_id);

    // 3. User ID Sync
    if (donor.user_id) {
      await adminClient.from("donors").update({
        status: nextStatus ? 'active' : 'suspended',
        suspension_reason: nextStatus ? null : (reason || "Administrative Review")
      }).eq("user_id", donor.user_id);
    }

    // Send notification if email exists
    let donorEmail = (donor as any).email || (donor as any).contact_email;
    const donorName = (donor as any).first_name || (donor as any).full_name || "Life-Saver";
    
    if (!donorEmail && donor.user_id) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(donor.user_id);
      donorEmail = authUser?.user?.email;
    }

    if (donorEmail) {
      await sendEmail({
        to: donorEmail,
        subject: `OPAL-AI: Your Account is now ${nextStatus ? 'ACTIVE' : 'SUSPENDED'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #ffffff; border-radius: 12px; border: 1px solid #1a1a1a;">
            <h1 style="color: ${nextStatus ? '#22c55e' : '#dc2626'}; text-align: center;">Account Status Updated</h1>
            <p>Hello ${donorName},</p>
            <p>Your clinical profile in the OPAL-AI Medical Network has been updated by the administration.</p>
            <div style="background: #111; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <span style="font-size: 20px; font-weight: bold; color: ${nextStatus ? '#22c55e' : '#dc2626'};">
                ${nextStatus ? 'Status: ACTIVE' : 'Status: SUSPENDED'}
              </span>
            </div>
            ${!nextStatus ? `<p style="color: #9ca3af;">Reason: ${reason || "Administrative Review"}</p>` : '<p>You are now eligible for live matching with recipients in need.</p>'}
            <p style="font-size: 12px; color: #4b5563; margin-top: 30px; text-align: center;">OPAL-AI Logistics Engine &copy; 2026</p>
          </div>
        `
      }).catch(err => console.error("Email dispatch failed:", err));
    }

    return NextResponse.json({ 
      success: true, 
      nextStatus,
      message: `Donor ${nextStatus ? 'activated' : 'suspended'} successfully.`
    });

  } catch (error: any) {
    console.error("Toggle API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Verified Clean - Refreshed Cache
