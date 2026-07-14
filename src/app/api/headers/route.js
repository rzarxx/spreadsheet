import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

/**
 * GET /api/headers
 * Returns column headers AND dropdown options detected from Google Sheets data validation.
 * Response: { headers: string[], fieldOptions: { [col]: string[] }, sheetTitle: string }
 */
export async function GET(request) {
  try {
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
    const headerRowIndex = parseInt(process.env.GOOGLE_HEADER_ROW || "1", 10); // 1-based

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

    // Load header row for addRow compatibility
    await sheet.loadHeaderRow(headerRowIndex);
    const headers = sheet.headerValues.filter((h) => h && h.trim() !== "");

    if (headers.length === 0) {
      return NextResponse.json(
        { error: `Baris ${headerRowIndex} di spreadsheet kosong. Pastikan baris tersebut berisi nama kolom.` },
        { status: 422 }
      );
    }

    // ── Detect Dropdown Validation ────────────────────────────────────────────
    // Load cells: header row + up to 10 rows below to find data validation rules
    const headerRowIdx0 = headerRowIndex - 1; // convert to 0-based
    const safeColCount = Math.min(sheet.columnCount || 26, 50);
    const safeRowEnd = Math.min(headerRowIndex + 10, (sheet.rowCount || headerRowIndex + 10));

    const fieldOptions = {};

    try {
      await sheet.loadCells({
        startRowIndex: headerRowIdx0,
        endRowIndex: safeRowEnd,
        startColumnIndex: 0,
        endColumnIndex: safeColCount,
      });

      // Map header name → column index
      const headerToColIdx = {};
      for (let col = 0; col < safeColCount; col++) {
        try {
          const cell = sheet.getCell(headerRowIdx0, col);
          if (cell?.value) {
            const name = String(cell.value).trim();
            if (name) headerToColIdx[name] = col;
          }
        } catch { break; }
      }

      // For each header, scan rows below for ONE_OF_LIST validation
      for (const header of headers) {
        const colIdx = headerToColIdx[header];
        if (colIdx === undefined) continue;

        for (let rowIdx = headerRowIndex; rowIdx < safeRowEnd; rowIdx++) {
          try {
            const cell = sheet.getCell(rowIdx, colIdx);
            const validation = cell?.dataValidation;
            if (validation?.condition?.type === "ONE_OF_LIST") {
              const opts = (validation.condition.values || [])
                .map((v) => v.userEnteredValue)
                .filter(Boolean);
              if (opts.length > 0) {
                fieldOptions[header] = opts;
                break;
              }
            }
          } catch { /* cell has no validation */ }
        }
      }
    } catch (cellErr) {
      // If cell loading fails, proceed without dropdown options
      console.warn("[headers] Could not load cells for validation:", cellErr.message);
    }

    return NextResponse.json(
      { headers, fieldOptions, sheetTitle: sheet.title, headerRowIndex },
      { status: 200 }
    );

  } catch (error) {
    console.error("[headers] Error:", error.message);

    if (error.message?.includes("No values in the header row")) {
      const rowIndex = parseInt(process.env.GOOGLE_HEADER_ROW || "1", 10);
      return NextResponse.json(
        { error: `Baris ${rowIndex} kosong. Set GOOGLE_HEADER_ROW sesuai nomor baris header Anda.` },
        { status: 422 }
      );
    }
    if (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("403")) {
      return NextResponse.json(
        { error: "Akses ditolak. Pastikan Service Account sudah diberi akses Editor ke Spreadsheet." },
        { status: 403 }
      );
    }
    if (error.message?.includes("not found")) {
      return NextResponse.json(
        { error: "Spreadsheet tidak ditemukan. Periksa GOOGLE_SHEET_ID di .env.local." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Gagal memuat konfigurasi spreadsheet. Periksa log server untuk detail." },
      { status: 500 }
    );
  }
}
