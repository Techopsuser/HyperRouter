import { NextResponse } from "next/server";
import { summarizeAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const windowMin = parseInt(url.searchParams.get("window") || "60", 10);
  return NextResponse.json(summarizeAnalytics(windowMin));
}
