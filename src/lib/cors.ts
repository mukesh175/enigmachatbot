import { NextResponse } from "next/server";

/**
 * The widget is embedded on arbitrary client domains (that's the whole point
 * of the product), so these public chat endpoints must allow cross-origin
 * requests from anywhere. Domain restriction, where wanted, is enforced at
 * the application level instead (see campaign.allowedDomains check in
 * /api/chat/start), not via CORS.
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function corsJson(body: any, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status || 200,
    headers: CORS_HEADERS,
  });
}

export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
