import { NextResponse } from "next/server";
import { detectIntent } from "@/lib/router";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { prompt } = (await req.json()) as { prompt?: string };
  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });
  return NextResponse.json(detectIntent(prompt));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const prompt = url.searchParams.get("prompt") || "";
  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });
  return NextResponse.json(detectIntent(prompt));
}
