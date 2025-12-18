import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  try {
    // Ensure only admins can call this
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase env vars in user-athlete-metadata route");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get auth user with metadata
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !data?.user) {
      console.error("Error fetching auth user for athlete metadata:", error);
      return NextResponse.json(
        { success: false, error: "User not found in authentication" },
        { status: 404 }
      );
    }

    const metadata = (data.user.user_metadata || {}) as any;
    const dob: string | undefined =
      metadata.date_of_birth || metadata.dateOfBirth || undefined;
    const playingHand: string | undefined =
      metadata.playing_hand || metadata.playingHand || undefined;

    // Calculate age from DOB if available
    let age: number | null = null;
    if (dob) {
      try {
        let birthDate: Date;

        if (dob.includes("/")) {
          // DD/MM/YYYY
          const parts = dob.split("/");
          if (parts.length === 3) {
            birthDate = new Date(
              parseInt(parts[2]),
              parseInt(parts[1]) - 1,
              parseInt(parts[0])
            );
          } else {
            birthDate = new Date(dob);
          }
        } else {
          // Assume ISO YYYY-MM-DD
          birthDate = new Date(dob);
        }

        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          let calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ) {
            calculatedAge--;
          }
          age = calculatedAge;
        }
      } catch (e) {
        console.error("Error calculating age from DOB in metadata:", e);
        age = null;
      }
    }

    return NextResponse.json({
      success: true,
      age,
      hand:
        playingHand === "left" || playingHand === "right"
          ? (playingHand as "left" | "right")
          : null,
      rawDob: dob || null,
    });
  } catch (error) {
    console.error("Error in user-athlete-metadata API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
