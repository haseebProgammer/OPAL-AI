import { NextResponse } from "next/server";
import { createServerSupabase, getServiceSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function DELETE() {
  const cookieStore = await cookies();
  const supabase = await createServerSupabase(cookieStore);
  const adminClient = getServiceSupabase();

  try {
    // 1. Get logged in user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const role = user.user_metadata?.role;

    // 2. Clear Professional Records based on role
    if (role === 'hospital') {
      await adminClient.from('hospitals').delete().eq('user_id', userId);
    } else if (role === 'donor') {
      await adminClient.from('donors').delete().eq('user_id', userId);
      await adminClient.from('blood_donors').delete().eq('user_id', userId);
      await adminClient.from('organ_donors').delete().eq('user_id', userId);
    }

    // 3. Delete Auth Account (This is the critical step)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    // 4. Log out the session from the edge
    await supabase.auth.signOut();

    return NextResponse.json({ success: true, message: "Account purged successfully." });
  } catch (error: any) {
    console.error("DELETION ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
