import { NextResponse } from "next/server";
import { getRenewableLeaderboard, getCarbonLeaderboard } from "@/lib/fetcher";

export const revalidate = 900;

export async function GET() {
  try {
    const [renewable, carbon] = await Promise.all([
      getRenewableLeaderboard(),
      getCarbonLeaderboard(),
    ]);
    return NextResponse.json({
      renewable,
      carbon,
      lastFetched: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
