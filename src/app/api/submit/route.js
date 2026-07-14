import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

/**
 * POST /api/submit
 * Accepts a dynamic JSON payload and appends it as a new row to the Google Sheet.
 * The payload keys must match the header row in the Sheet.
 * Body: { fields: { [columnName: string]: string } }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { fields } = body;

    // Validate: fields must exist and be a non-empty object
    if (!fields || typeof fields !== "object" || Object.keys(fields).length === 0) {
      return NextResponse.json(
        { error: "Data tidak valid. Pastikan semua field terisi." },
        { status: 400 }
      );
    }

    // Validate: no empty values
    const emptyFields = Object.entries(fields).filter(([, val]) => !val || String(val).trim() === "");
    if (emptyFields.length > 0) {
      return NextResponse.json(
        { error: `Mohon lengkapi semua field: ${emptyFields.map(([k]) => k).join(", ")}` },
        { status: 400 }
      );
    }

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];

    // Use the same header row index as the headers API so addRow maps correctly
    const headerRowIndex = parseInt(process.env.GOOGLE_HEADER_ROW || "1", 10);
    await sheet.loadHeaderRow(headerRowIndex);

    // Build the row object from dynamic fields
    const rowData = { ...fields };

    await sheet.addRow(rowData);

    return NextResponse.json(
      { success: true, message: "Data berhasil disimpan ke Google Sheets." },
      { status: 200 }
    );

  } catch (error) {
    console.error("Kesalahan API Google Sheets:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server saat menyimpan data." },
      { status: 500 }
    );
  }
}
