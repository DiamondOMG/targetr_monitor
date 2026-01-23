import { NextResponse } from "next/server";
import { clear_google_sheets_cache } from "@/app/actions/google";

export async function POST() {
  const result = await clear_google_sheets_cache();

  if (result.success) {
    return NextResponse.json({ message: "Cache cleared successfully" });
  } else {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
}

// สำหรับการทดสอบผ่าน Browser ง่ายๆ (GET)
export async function GET() {
  const result = await clear_google_sheets_cache();
  return NextResponse.json({ message: "Cache cleared (via GET)", result });
}
