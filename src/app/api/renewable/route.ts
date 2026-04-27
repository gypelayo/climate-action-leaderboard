import { NextResponse } from "next/server";
import { getRenewableLeaderboard } from "@/lib/fetcher";

export const revalidate = 900; // 15 minutes

export async function GET() {
  try {
    const data = await getRenewableLeaderboard();
    return NextResponse.json({ data, lastFetched: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch renewable data" }, { status: 500 });
  }
}
