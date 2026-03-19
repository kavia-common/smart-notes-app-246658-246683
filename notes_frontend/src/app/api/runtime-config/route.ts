import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PUBLIC_INTERFACE
export async function GET() {
  /** Return runtime configuration derived from server environment variables. */
  const apiBase = process.env.API_BASE || process.env.BACKEND_URL || "";
  const wsUrl = process.env.WS_URL || "";

  return NextResponse.json(
    { apiBase, wsUrl },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
