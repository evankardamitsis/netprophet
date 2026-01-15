import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  try {
    // Authenticate and authorize admin user
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    // Fetch last_sign_in_at from auth.users for each profile
    const userIds = profiles?.map((p) => p.id) || [];
    const usersWithLastLogin = await Promise.all(
      (profiles || []).map(async (profile) => {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            profile.id
          );
          return {
            ...profile,
            last_login: authUser?.user?.last_sign_in_at || null,
          };
        } catch (error) {
          console.error(`Error fetching auth user for ${profile.id}:`, error);
          return {
            ...profile,
            last_login: null,
          };
        }
      })
    );

    return NextResponse.json({ users: usersWithLastLogin });
  } catch (error) {
    console.error("Error in users API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
