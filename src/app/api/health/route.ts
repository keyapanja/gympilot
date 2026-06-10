import { NextResponse } from "next/server";

/** Liveness probe for uptime monitoring / Vercel checks. */
export async function GET() {
  return NextResponse.json({ status: "ok", service: "gympilot", time: new Date().toISOString() });
}
