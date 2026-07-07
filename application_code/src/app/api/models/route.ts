import { NextResponse } from "next/server";
import { MODEL_REGISTRY, PROVIDERS } from "@/lib/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    total: MODEL_REGISTRY.length,
    providers: PROVIDERS,
    models: MODEL_REGISTRY,
  });
}
