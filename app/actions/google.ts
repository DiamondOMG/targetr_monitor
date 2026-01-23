"use server";

import { axios_google_get, axios_google_get_metadata, GOOGLE_SHEET_ID } from "@/lib/axios_google";
import { kv } from "@vercel/kv";

const apiKey = process.env.GOOGLE_API_KEY || "";
const CACHE_KEY = "google_sheets_all_data";
const CACHE_TTL = 15 * 60; // 15 นาที (หน่วยเป็นวินาที)

/**
 * Helper สำหรับแปลงข้อมูลจาก Google Visualization API เป็น Array ของ Object
 */
function transformGoogleData(rawData: any) {
  if (!rawData?.table?.cols || !rawData?.table?.rows) return [];

  return rawData.table.rows.map((row: any) => {
    const item: any = {};
    row.c.forEach((cell: any, i: number) => {
      const label = (rawData.table.cols[i].label || "").trim().toLowerCase();
      const value = cell ? cell.v : null;

      if (!label && (value === null || value === "")) {
        return;
      }

      item[label || `column_${i}`] = value;
    });
    return item;
  }).filter((item: any) => {
    const deviceValue = String(item.device || "").trim().toLowerCase();
    return deviceValue === "screen" || deviceValue === "router";
  });
}

/**
 * ฟังก์ชันหลักภายในสำหรับดึงข้อมูลจริงจาก Google
 */
async function fetchFreshData() {
  const metadata = await axios_google_get_metadata();
  const sheetNames = metadata.sheets
    .map((s: any) => s.properties.title)
    .filter((title: string) => title.startsWith("TopsDigital") || title.startsWith("Dear"));

  const allData: any = {};
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
  return allData;
}

export async function google_get_sheet_raw(sheetName: string, query: string = "SELECT *") {
  try {
    const rawData = await axios_google_get(GOOGLE_SHEET_ID, sheetName, query, apiKey);
    return { success: true, data: rawData };
  } catch (error: any) {
    console.error("Error in google_get_sheet_raw:", error);
    return { success: false, error: error.message };
  }
}

export async function google_get_sheet(sheetName: string, query: string = "SELECT *") {
  try {
    const rawData = await axios_google_get(GOOGLE_SHEET_ID, sheetName, query, apiKey);
    const rows = transformGoogleData(rawData);
    return { success: true, data: rows };
  } catch (error: any) {
    console.error("Error in google_get_sheet:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ดึงข้อมูลจากทุก Sheet พร้อมระบบ Cache ด้วย Vercel KV (Redis)
 */
export async function google_get_all_sheets_data() {
  try {
    // 1. ลองดึงข้อมูลจาก Cache (Redis)
    const cachedData = await kv.get(CACHE_KEY);
    if (cachedData) {
      console.log("🚀 Serving from Vercel KV Cache");
      return { success: true, data: cachedData, cached: true };
    }

    // 2. ถ้าไม่มีใน Cache ให้ดึงใหม่จาก Google
    console.log("📡 Cache miss. Fetching fresh data from Google Sheets...");
    const freshData = await fetchFreshData();

    // 3. เก็บลง Cache พร้อมตั้งเวลาหมดอายุ (15 นาที)
    await kv.set(CACHE_KEY, freshData, { ex: CACHE_TTL });

    return { success: true, data: freshData, cached: false };
  } catch (error: any) {
    console.error("Error in google_get_all_sheets_data:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ฟังก์ชันสำหรับล้าง Cache ด้วยตัวเอง
 */
export async function clear_google_sheets_cache() {
  try {
    await kv.del(CACHE_KEY);
    console.log("🧹 Cache cleared successfully");
    return { success: true, message: "Cache cleared" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}