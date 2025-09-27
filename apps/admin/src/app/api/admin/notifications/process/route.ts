import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // Call the database function to process pending notifications
    const { data, error } = await supabase.rpc(
      "process_pending_admin_notifications"
    );

    if (error) {
      console.error("Error processing admin notifications:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = data?.[0] || { processed_count: 0, error_count: 0 };

    console.log(
      `Processed ${result.processed_count} admin notifications, ${result.error_count} errors`
    );

    return NextResponse.json({
      success: true,
      processed_count: result.processed_count,
      error_count: result.error_count,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
