import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { donorFormSchema } from "@/lib/schemas/donor";
import { sendDonorWelcomeEmail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 1. Validation
    const result = donorFormSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = result.data;
    const adminSupabase = getServiceSupabase();
    
    // 2. Strict Check for Duplicate Email
    const { data: existingUsersData } = await adminSupabase.auth.admin.listUsers();
    if (existingUsersData?.users.some(u => u.email === data.email)) {
      return NextResponse.json({ success: false, error: "An account already exists with this email address." }, { status: 409 });
    }

    // 3. Strict Check for Duplicate CNIC
    const { data: existingCNIC } = await adminSupabase
      .from('donors')
      .select('id')
      .eq('cnic', data.cnic)
      .maybeSingle();

    if (existingCNIC) {
      return NextResponse.json({ success: false, error: "This CNIC is already registered in our network." }, { status: 409 });
    }

    // 3. Create Auth User
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        role: 'donor'
      }
    });

    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error("Auth failed: No ID generated");

    // 4. Insert into Central Donors table
    const birthDate = new Date(new Date().getFullYear() - (data.age || 20), 0, 1).toISOString().split('T')[0];
    
    const { error: dbError } = await adminSupabase.from('donors').insert([{
      user_id: userId,
      first_name: data.firstName,
      last_name: data.lastName,
      birth_date: birthDate,
      city: data.city,
      blood_type: data.bloodType,
      contact_number: data.contactNumber,
      cnic: data.cnic,
      gender: data.gender,
      is_blood_donor: data.donationType === "Blood Donation Only" || data.donationType === "Both",
      is_organ_donor: data.donationType === "Organ Donation Only" || data.donationType === "Both",
      status: 'pending'
    }]);

    if (dbError) throw dbError;

    // 5. Insert into specialized tables
    if (data.donationType === "Blood Donation Only" || data.donationType === "Both") {
       await adminSupabase.from('blood_donors').insert([{
        user_id: userId,
        full_name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.contactNumber,
        age: data.age,
        blood_type: data.bloodType,
        hepatitis_status: data.hepStatus,
        city: data.city,
        is_available: false,
        approval_status: 'pending'
      }]);
    }

    if (data.donationType === "Organ Donation Only" || data.donationType === "Both") {
       await adminSupabase.from('organ_donors').insert([{
        user_id: userId,
        full_name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.contactNumber,
        age: data.age,
        blood_type: data.bloodType,
        organs_available: data.organsWilling || [],
        hiv_status: data.hivStatus || "Negative",
        hepatitis_status: data.hepStatus,
        is_living_donor: data.donorStatus === "Living",
        next_of_kin_name: data.nextOfKinName,
        next_of_kin_contact: data.nextOfKinContact,
        consent_given: !!data.consent,
        city: data.city,
        is_available: false,
        approval_status: 'pending'
      }]);
    }

    // 6. Send Welcome Email (Awaited for reliability)
    try {
      await sendDonorWelcomeEmail(data.email, `${data.firstName} ${data.lastName}`, data.bloodType);
    } catch (e) {
      console.error("Welcome Email Sending Failed:", e);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Donor account created. Pending administrative approval.",
      redirect: "/auth/pending-approval"
    }, { status: 201 });

  } catch (error: any) {
    console.error("DONOR REGISTRATION ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
