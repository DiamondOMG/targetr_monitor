import axios from "axios";
import { JWT } from "google-auth-library";

export const GOOGLE_SHEET_ID = "1FqkrWem-t83KALPVJ94jODKKrBwfuLhbsSJFzCQSy5w";
export const GOOGLE_GET_URL = "https://docs.google.com/spreadsheets/d";
export const GOOGLE_CRUD_URL = "https://sheets.googleapis.com/v4/spreadsheets";

// ดึงค่าจาก .env และจัดการเรื่องตัวขึ้นบรรทัดใหม่ (\n) ใน Private Key
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const serviceAccountPrivateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");

// สร้าง JWT client สำหรับ Service Account
const client = new JWT({
  email: serviceAccountEmail,
  key: serviceAccountPrivateKey,
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
 * ฟังก์ชัน Generic สำหรับติดต่อ Google Sheets API v4
 * รองรับทั้ง GET (อ่าน), POST/PUT (เขียน), DELETE
 */
export async function axios_google_api({
  method = "GET",
  range,
  data = null,
  sheetId = GOOGLE_SHEET_ID,
  valueRenderOption = "FORMATTED_VALUE", // สำหรับการอ่าน (GET)
  valueInputOption = "USER_ENTERED",    // สำหรับการเขียน (POST/PUT)
}: {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  range: string;
  data?: any;
  sheetId?: string;
  valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA";
  valueInputOption?: "USER_ENTERED" | "RAW";
}) {
  const token = await getAccessToken();
  
  // Google Sheets API v4: ถ้าชื่อ Sheet มีอักขระพิเศษ (เช่น - หรือ space) ต้องครอบด้วย single quotes
  // รูปแบบ: 'Sheet Name'!A1:Z1000 หรือแค่ 'Sheet Name'
  const formattedRange = range.includes("'") ? range : `'${range}'`;
  let url = `${GOOGLE_CRUD_URL}/${sheetId}/values/${encodeURIComponent(formattedRange)}`;

  const params = new URLSearchParams();
  if (method === "GET") {
    params.append("valueRenderOption", valueRenderOption);
  } else if (method === "POST" || method === "PUT" || method === "PATCH") {
    params.append("valueInputOption", valueInputOption);
  }

  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  const res = await axios({
    method,
    url,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    // ถ้า method เป็น GET ไม่ต้องส่ง data
    data: (method !== "GET" && data) ? { values: Array.isArray(data) ? data : [data] } : undefined,
  });

  return res.data;
}
