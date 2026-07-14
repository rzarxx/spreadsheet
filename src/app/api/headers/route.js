import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

/**
 * GET /api/headers
 * Reads a specific header row from the configured Google Sheet and returns column names.
 *
 * Env variables:
 *   GOOGLE_CLIENT_EMAIL  - Service account email
 *   GOOGLE_PRIVATE_KEY   - Service account private key
 *   GOOGLE_SHEET_ID      - Google Spreadsheet ID
 *   GOOGLE_HEADER_ROW    - (optional) 1-based row index where headers live. Default: 1
 */
export async function GET() {
  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // GOOGLE_HEADER_ROW: which row (1-based) contains the column headers. Default = 1
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

    // Load the specific row as header (supports non-row-1 headers like row 6)
    await sheet.loadHeaderRow(headerRowIndex);

    const headers = sheet.headerValues.filter(h => h && h.trim() !== "");

    if (headers.length === 0) {
      return NextResponse.json(
        {
          error: `Baris ${headerRowIndex} di spreadsheet masih kosong atau tidak memiliki header. Pastikan baris tersebut berisi nama kolom (contoh: Tanggal, Platform, Akun, Judul).`
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { headers, sheetTitle: sheet.title, headerRowIndex },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error fetching headers:", error);

    // Specific: header row is empty
    if (error.message && error.message.includes("No values in the header row")) {
      const rowIndex = parseInt(process.env.GOOGLE_HEADER_ROW || "1", 10);
      return NextResponse.json(
        { error: `Baris ${rowIndex} di spreadsheet kosong. Set GOOGLE_HEADER_ROW di .env.local sesuai nomor baris yang berisi header kolom Anda (misal: GOOGLE_HEADER_ROW=6).` },
        { status: 422 }
      );
    }

    // Specific: wrong Sheet ID or no access
    if (error.message && (error.message.includes("not found") || error.message.includes("PERMISSION_DENIED") || error.message.includes("403"))) {
      return NextResponse.json(
        { error: "Spreadsheet tidak ditemukan atau Service Account belum diberi akses Editor." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: `Gagal terhubung ke Google Sheets: ${error.message}` },
      { status: 500 }
    );
  }
}
