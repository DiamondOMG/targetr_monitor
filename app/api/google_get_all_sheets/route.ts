import { NextResponse } from "next/server";
import { google_get_all_sheets_data } from "@/app/actions/google";

export async function GET() {
  const result = await google_get_all_sheets_data();

  if (result.success) {
    return NextResponse.json(result.data);
  } else {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
}
