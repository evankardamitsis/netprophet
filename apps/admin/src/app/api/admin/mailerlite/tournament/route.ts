import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { runTournamentAnnouncement } from "@/lib/mailerliteCron";

/** POST — trigger MailerLite tournament announcement blast (admin only). */
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const result = await runTournamentAnnouncement();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[mailerlite tournament]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
