"use server";

import { axios_google_get, GOOGLE_SHEET_ID } from "@/lib/axios_google";

const apiKey = process.env.GOOGLE_API_KEY || "";

export async function google_get_all(sheetName: string, query: string = "SELECT *") {
  try {
    const rows = await axios_google_get(GOOGLE_SHEET_ID, sheetName, query, apiKey);
    return { success: true, data: rows };
  } catch (error: any) {
    console.error("Error in google_get_all:", error);
    return { success: false, error: error.message };
  }
}