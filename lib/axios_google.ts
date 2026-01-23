import axios from "axios";
import { JWT } from "google-auth-library";
import keys from "./targetr_monitor_json_key.json";

export const GOOGLE_SHEET_ID = "1FqkrWem-t83KALPVJ94jODKKrBwfuLhbsSJFzCQSy5w";
export const GOOGLE_GET_URL = "https://docs.google.com/spreadsheets/d";
export const GOOGLE_CRUD_URL = "https://sheets.googleapis.com/v4/spreadsheets";

// สร้าง JWT client สำหรับ Service Account
const client = new JWT({
  email: keys.client_email,
  key: keys.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

/**
 * ดึง Access Token จาก Service Account
 */
async function getAccessToken() {
  const token = await client.getAccessToken();
  return token.token;
}

/**
 * สำหรับ View ข้อมูลผ่าน Google Visualization API (ใช้ API Key)
 */
export async function axios_google_get(sheetId: string, sheetName: string, query: string, apiKey: string) {
  const url = `${GOOGLE_GET_URL}/${sheetId}/gviz/tq?tq=${encodeURIComponent(query)}&sheet=${encodeURIComponent(sheetName)}&key=${apiKey}`;

  const res = await axios.get(url, { responseType: 'text' });
  const text = res.data;

  const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(jsonStr);
}

/**
 * ดึง Metadata ของ Spreadsheet (เช่น รายชื่อ Sheet ทั้งหมด)
 */
export async function axios_google_get_metadata(sheetId: string = GOOGLE_SHEET_ID) {
  const token = await getAccessToken();
  const url = `${GOOGLE_CRUD_URL}/${sheetId}`;

  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
}

/**
 * สำหรับ CRUD ข้อมูลผ่าน Google Sheets API v4 (ใช้ Service Account Access Token)
 */
export async function axios_google_crud(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  range: string,
  data: any = null,
  sheetId: string = GOOGLE_SHEET_ID
) {
  const token = await getAccessToken();
  
  // เพิ่ม valueInputOption=USER_ENTERED สำหรับการเขียนข้อมูล เพื่อให้ Google แปลงข้อมูลตามรูปแบบ (เช่น วันที่ หรือ สูตร)
  let url = `${GOOGLE_CRUD_URL}/${sheetId}/values/${range}`;
  if (method === "POST" || method === "PUT") {
    url += "?valueInputOption=USER_ENTERED";
  }

  const res = await axios({
    method,
    url,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: data ? { values: data } : null, // รูปแบบข้อมูลของ Sheets API ต้องอยู่ใน object { values: [...] }
  });

  return res.data;
}
