import { NextResponse } from "next/server";
import { getCarbonLeaderboard } from "@/lib/fetcher";

export const revalidate = 86400; // 24 hours (annual data)

export async function GET() {
  try {
    const data = await getCarbonLeaderboard();
    return NextResponse.json({ data, lastFetched: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch carbon data" }, { status: 500 });
  }
}
