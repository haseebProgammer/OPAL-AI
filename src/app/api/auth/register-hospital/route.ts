import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { hospitalFormSchema } from "@/lib/schemas/hospital";
import { sendHospitalWelcomeEmail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 1. Validation
    const result = hospitalFormSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Validation failed", 
        details: result.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const data = result.data;
    const adminSupabase = getServiceSupabase();
    
    // 2. Auth: Register the Hospital Admin account
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: data.contact_email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        role: 'hospital',
        hospital_name: data.name // Standardized
      }
    });

    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Auth storage failed");

    // 3. Profiles: Establish Identity First
    const { error: profileError } = await adminSupabase.from('profiles').insert([{
      id: userId,
      email: data.contact_email,
      role: 'hospital',
      full_name: data.admin_name
    }]);

    if (profileError) throw profileError;

    // 4. Hospitals: Link specialized data
    const { error: hospError } = await adminSupabase.from('hospitals').insert([{
      user_id: userId,
      name: data.name, // Corrected column name
      license_number: data.license_number,
      city: data.city,
      full_address: data.full_address,
      phone: data.contact_phone,
      contact_email: data.contact_email,
      latitude: data.latitude,
      longitude: data.longitude,
      is_verified: false
    }]);

    if (hospError) throw hospError;

    // 5. Welcome Sequence
    try {
      await sendHospitalWelcomeEmail(data.contact_email, data.name);
    } catch (e) {
      console.warn("Notification delay: Hospital welcome email failed.", e);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Hospital registration received. Awaiting clinical credential verification.",
      redirect: "/auth/pending-approval" 
    }, { status: 201 });

  } catch (error: any) {
    console.error("HOSPITAL REGISTRATION FAILURE:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
