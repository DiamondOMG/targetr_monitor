"use server";

import { axios_google_get_metadata, axios_google_api } from "@/lib/axios_google";
import { kv } from "@vercel/kv";

const CACHE_KEY = "google_sheets_all_data";
const CACHE_TTL = 15 * 60; // 15 นาที (หน่วยเป็นวินาที)

/**
 * Helper สำหรับแปลงข้อมูลจาก Google Sheets API v4 (raw values) เป็น Array ของ Object
 * ข้อมูลทั้งหมดจะเป็น string เพื่อหลีกเลี่ยงปัญหา type inference
 */
function transformRawSheetData(rawData: any) {
  if (!rawData?.values || rawData.values.length < 1) return [];

  const headers = rawData.values[0].map((h: any) => String(h || "").trim().toLowerCase());
  const rows = rawData.values.slice(1);

  return rows.map((row: any[]) => {
    const item: any = {};
    headers.forEach((header: string, i: number) => {
      const value = row[i] !== undefined ? String(row[i]) : "";
      if (header) item[header] = value;
      else if (value) item[`column_${i}`] = value;
    });
    return item;
  }).filter((item: any) => {
    const deviceValue = String(item.device || "").trim().toLowerCase();
    return deviceValue === "screen" || deviceValue === "router";
  });
}

/**
 * ดึงข้อมูลจาก Google Sheets ตามชื่อ Sheet
 */
export async function google_get_sheet(sheetName: string) {
  try {
    const rawData = await axios_google_api({ range: sheetName });
    const rows = transformRawSheetData(rawData);
    return { success: true, data: rows };
  } catch (error: any) {
    console.error(`Error in google_get_sheet (${sheetName}):`, error);
    return { success: false, error: error.message };
  }
}

/**
 * ดึงข้อมูลจากทุก Sheet พร้อมระบบ Cache
 */
export async function google_get_all_sheets_data() {
  try {
    const cachedData = await kv.get(CACHE_KEY);
    if (cachedData) return { success: true, data: cachedData, cached: true };

    const metadata = await axios_google_get_metadata();
    const sheetNames = metadata.sheets
      .map((s: any) => s.properties.title)
      .filter((title: string) => title.startsWith("TopsDigital") || title.startsWith("Dear"));

    const allData: any = {};
    await Promise.all(
      sheetNames.map(async (name: string) => {
        try {
          const rawData = await axios_google_api({ range: name });
          allData[name] = transformRawSheetData(rawData);
        } catch (err) {
          console.error(`Error fetching sheet ${name}:`, err);
          allData[name] = [];
        }
      })
    );

    await kv.set(CACHE_KEY, allData, { ex: CACHE_TTL });
    return { success: true, data: allData, cached: false };
  } catch (error: any) {
    console.error("Error in google_get_all_sheets_data:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ล้าง Cache ข้อมูล Google Sheets
 */
export async function clear_google_sheets_cache() {
  try {
    await kv.del(CACHE_KEY);
    return { success: true, message: "Cache cleared" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
