import { NextRequest, NextResponse } from "next/server";
import { requireClientId } from "@/lib/session";

// Accepts a base64 data URL already compressed client-side (see FlowBuilder's
// canvas resize) and just validates/passes it back. Kept as its own endpoint
// so a real object-storage backend (S3, Cloudinary, Vercel Blob) can be
// swapped in later without touching the builder UI.
export async function POST(req: NextRequest) {
  try {
    await requireClientId();
    const { dataUrl } = await req.json();

    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
    }

    // Rough size guard — base64 is ~33% larger than raw bytes.
    // Keeps individual campaign rows from bloating the jsonb column.
    const approxBytes = (dataUrl.length * 3) / 4;
    if (approxBytes > 1_500_000) {
      return NextResponse.json({ error: "Image too large — please use a smaller image (under ~1.5MB)." }, { status: 400 });
    }

    return NextResponse.json({ url: dataUrl });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
