import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// ─── Rate Limiter (In-Memory, per-instance) ──────────────────────────────────
// Batasan: 30 req per IP per menit untuk endpoint read-only ini
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

/**
 * GET /api/headers
 * Membaca baris header dari Google Sheet dan mengembalikan nama kolom.
 *
 * Env variables:
 *   GOOGLE_CLIENT_EMAIL  - Service account email
 *   GOOGLE_PRIVATE_KEY   - Service account private key
 *   GOOGLE_SHEET_ID      - Google Spreadsheet ID
 *   GOOGLE_HEADER_ROW    - (optional) Nomor baris header 1-based, default: 1
 */
export async function GET(request) {
  try {
    // ── Rate Limiting ──────────────────────────────────────────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan coba lagi dalam 1 menit." },
        { status: 429 }
      );
    }

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const headerRowIndex = parseInt(process.env.GOOGLE_HEADER_ROW || "1", 10);

    if (!clientEmail || !privateKey || !sheetId) {
      return NextResponse.json(
        { error: "Kredensial Google belum dikonfigurasi. Isi GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, dan GOOGLE_SHEET_ID di file .env.local." },
        { status: 503 }
      );
    }

    const serviceAccountAuth = new JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow(headerRowIndex);

    const headers = sheet.headerValues.filter(h => h && h.trim() !== "");

    if (headers.length === 0) {
      return NextResponse.json(
        { error: `Baris ${headerRowIndex} di spreadsheet masih kosong atau tidak memiliki header. Pastikan baris tersebut berisi nama kolom (contoh: Tanggal, Platform, Akun, Judul).` },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { headers, sheetTitle: sheet.title, headerRowIndex },
      { status: 200 }
    );

  } catch (error) {
    // Log detail di server — jangan bocorkan ke client
    console.error("[headers] Error:", error.message);

    if (error.message && error.message.includes("No values in the header row")) {
      const rowIndex = parseInt(process.env.GOOGLE_HEADER_ROW || "1", 10);
      return NextResponse.json(
        { error: `Baris ${rowIndex} di spreadsheet kosong. Set GOOGLE_HEADER_ROW di .env.local sesuai nomor baris header Anda (misal: GOOGLE_HEADER_ROW=6).` },
        { status: 422 }
      );
    }

    if (error.message && (error.message.includes("PERMISSION_DENIED") || error.message.includes("403"))) {
      return NextResponse.json(
        { error: "Akses ditolak. Pastikan Service Account sudah diberi akses Editor ke Spreadsheet." },
        { status: 403 }
      );
    }

    if (error.message && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Spreadsheet tidak ditemukan. Periksa GOOGLE_SHEET_ID di .env.local." },
        { status: 404 }
      );
    }

    // Generic error — JANGAN bocorkan error.message ke client
    return NextResponse.json(
      { error: "Gagal memuat konfigurasi spreadsheet. Periksa log server untuk detail." },
      { status: 500 }
    );
  }
}
