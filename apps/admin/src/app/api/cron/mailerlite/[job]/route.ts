import { NextRequest, NextResponse } from "next/server";
import {
  runInactivitySync,
  runMatchAlert,
  runTournamentAnnouncement,
  runWeeklyLeaderboardSync,
} from "@/lib/mailerliteCron";

const JOBS = [
  "weekly",
  "inactivity",
  "match-alert-monday",
  "match-alert-thursday",
  "tournament",
] as const;

type Job = (typeof JOBS)[number];

function isJob(value: string): value is Job {
  return (JOBS as readonly string[]).includes(value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ job: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { job: jobParam } = await params;
    if (!isJob(jobParam)) {
      return NextResponse.json(
        { error: `Unknown job. Valid: ${JOBS.join(", ")}` },
        { status: 400 }
      );
    }

    let result: Record<string, unknown>;

    switch (jobParam) {
      case "weekly":
        result = await runWeeklyLeaderboardSync();
        break;
      case "inactivity":
        result = await runInactivitySync();
        break;
      case "match-alert-monday":
        result = await runMatchAlert("monday");
        break;
      case "match-alert-thursday":
        result = await runMatchAlert("thursday");
        break;
      case "tournament":
        result = await runTournamentAnnouncement();
        break;
    }

    return NextResponse.json({
      success: true,
      job: jobParam,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[mailerlite cron]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
