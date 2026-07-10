import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const { clientId, role } = await requireSession();
    return NextResponse.json({ clientId, role });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
