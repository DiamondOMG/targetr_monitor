import { NextRequest, NextResponse } from "next/server";
import { google_get_sheet } from "@/app/actions/google";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sheetName = searchParams.get("sheetName");

  if (!sheetName) {
    return NextResponse.json({ success: false, error: "sheetName is required" }, { status: 400 });
  }

  const result = await google_get_sheet(sheetName);

  if (result.success) {
    return NextResponse.json(result.data);
  } else {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
}
