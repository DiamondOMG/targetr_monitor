"use server";

import { axios_google_get, axios_google_get_metadata, GOOGLE_SHEET_ID } from "@/lib/axios_google";

const apiKey = process.env.GOOGLE_API_KEY || "";

/**
 * Helper สำหรับแปลงข้อมูลจาก Google Visualization API เป็น Array ของ Object
 */
function transformGoogleData(rawData: any) {
  if (!rawData?.table?.cols || !rawData?.table?.rows) return [];

  const cols = rawData.table.cols.map((col: any) => col.label || "unknown");
  return rawData.table.rows.map((row: any) => {
    const item: any = {};
    row.c.forEach((cell: any, i: number) => {
      item[cols[i]] = cell ? cell.v : null;
    });
    return item;
  });
}

export async function google_get_all(sheetName: string, query: string = "SELECT *") {
  try {
    const rawData = await axios_google_get(GOOGLE_SHEET_ID, sheetName, query, apiKey);
    const rows = transformGoogleData(rawData);
    return { success: true, data: rows };
  } catch (error: any) {
    console.error("Error in google_get_all:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ดึงข้อมูลจากทุก Sheet ใน Spreadsheet (ยกเว้น Read Me)
 */
export async function google_get_all_sheets_data() {
  try {
    // 1. ดึงข้อมูล Sheets ทั้งหมดที่มีในไฟล์
    const metadata = await axios_google_get_metadata();
    const sheetNames = metadata.sheets
      .map((s: any) => s.properties.title)
      .filter((title: string) => title !== "Read Me");

    // 2. ดึงข้อมูลจากแต่ละ Sheet
    const allData: any = {};
    
    // ใช้ Promise.all เพื่อดึงข้อมูลพร้อมกัน (เร็วขึ้น)
    await Promise.all(
      sheetNames.map(async (name: string) => {
        try {
          const rawData = await axios_google_get(GOOGLE_SHEET_ID, name, "SELECT *", apiKey);
          allData[name] = transformGoogleData(rawData);
        } catch (err) {
          console.error(`Error fetching sheet ${name}:`, err);
          allData[name] = [];
        }
      })
    );

    return { success: true, data: allData };
  } catch (error: any) {
    console.error("Error in google_get_all_sheets_data:", error);
    return { success: false, error: error.message };
  }
}