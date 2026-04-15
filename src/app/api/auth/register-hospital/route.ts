import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getServiceSupabase } from "@/lib/supabase";
import { HospitalRegistrationSchema } from "@/lib/schemas/hospital";
import { sendEmail } from "@/lib/mailer";

interface HospitalApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: Record<string, string[] | undefined>;
  userId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<HospitalApiResponse>> {
  try {
    const body: unknown = await request.json();
    
    // 1. Validate payload with Zod
    const result = HospitalRegistrationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Validation failed", 
        details: result.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const data = result.data;
    const supabase = await createServerSupabase();

    const adminSupabase = getServiceSupabase();
    
    // 1.5 Strict duplicate email check before signup
    const { data: existingUser } = await adminSupabase.from('hospitals').select('id').eq('email', data.email).maybeSingle();
    // Also check auth.users indirectly by trying to read it
    const { data: existingUsersData } = await adminSupabase.auth.admin.listUsers();
    const isDuplicate = existingUsersData?.users.some(u => u.email === data.email);

    if (isDuplicate) {
      return NextResponse.json({ success: false, error: "Institutional account already exists with this email" }, { status: 409 });
    }

    // 2. Create Supabase Auth User with metadata securely
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // auto-confirm here
      user_metadata: {
        hospital_name: data.hospital_name,
        role: 'hospital',
        admin_name: data.admin_name,
        designation: data.designation
      }
    });

    if (authError) {
      if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
        return NextResponse.json({ success: false, error: "Institutional account already exists with this email" }, { status: 409 });
      }
      throw authError; // if it's something else
    }

    const userId = authData.user?.id;
    if (!userId) throw new Error("Authentication failed: User ID not generated");

    // Small delay for DB sync
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Insert into 'hospitals' table using Admin Client
    
    const { error: dbError } = await adminSupabase.from('hospitals').insert([{
      user_id: userId,
      hospital_name: data.hospital_name,
      license_number: data.license_number,
      hospital_type: data.hospital_type,
      specialization: data.specialization,
      city: data.city,
      full_address: data.full_address,
      latitude: data.latitude,
      longitude: data.longitude,
      phone: data.phone,
      emergency_contact: data.emergency_contact,
      admin_name: data.admin_name,
      designation: data.designation,
      is_verified: false, // Must be approved by Super Admin per SRS medical protocol
      created_at: new Date().toISOString()
    }]);

    if (dbError) throw dbError;

    // 4. Send Confirmation Email via Nodemailer
    try {
      await sendEmail({
        to: data.email,
        subject: "OPAL-AI — Hospital Registration Received",
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #0a0a0a; color: #ffffff; border-radius: 16px; border: 1px solid #1a1a1a;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #dc2626; font-size: 28px; margin: 0;">OPAL-AI</h1>
              <p style="color: #6b7280; font-size: 14px;">Institutional Access Verification</p>
            </div>
            
            <h2 style="color: #ffffff; font-size: 22px;">Application Received</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #9ca3af;">Hello ${data.admin_name},</p>
            <p style="font-size: 16px; line-height: 1.6; color: #9ca3af;">We have received your registration request for <strong>${data.hospital_name}</strong>.</p>
            <p style="font-size: 14px; line-height: 1.6; color: #6b7280; background: #1a1a1a; padding: 16px; border-radius: 8px;">
              Our medical verification team will review your license number (<strong>${data.license_number}</strong>) and institutional credentials within the next 24-48 hours.
            </p>
            
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #1f2937; text-align: center;">
              <p style="font-size: 12px; color: #4b5563;">OPAL-AI Secure Medical Network &copy; 2026<br/>Saving Lives Through AI Logistics</p>
            </div>
          </div>
        `
      });
    } catch (emailError) {
      console.error("Email error:", emailError);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Hospital application submitted for review.", 
      userId,
      redirect: "/auth/pending-approval"
    }, { status: 201 });

  } catch (error: any) {
    console.error("HOSPITAL REGISTRATION CRITICAL ERROR:", error);
    const message = error.message || "Internal Server Error";
    return NextResponse.json({ 
      success: false, 
      error: message,
      details: error.details || error.hint || undefined 
    }, { status: 500 });
  }
}
