import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// ─── Rate Limiter (In-Memory, per-instance) ──────────────────────────────────
// Batasan: 20 submit per IP per menit
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000; // 1 menit
const rateLimitMap = new Map(); // { ip: [timestamp, ...] }

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  // Bersihkan entry lama setiap 100 IP agar Map tidak membengkak
  if (rateLimitMap.size > 500) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (val.every((t) => now - t >= RATE_WINDOW_MS)) rateLimitMap.delete(key);
    }
  }
  return false;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FIELDS = 50;         // Maksimal jumlah kolom per submit
const MAX_VALUE_LENGTH = 1000; // Maksimal panjang karakter per nilai field

/**
 * POST /api/submit
 * Menerima payload dinamis dan menambahkan baris baru ke Google Sheet.
 * Body: { fields: { [columnName: string]: string | number } }
 */
export async function POST(request) {
  try {
    // ── 1. Rate Limiting ────────────────────────────────────────────────────
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

    // ── 2. Parse Body ───────────────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
    }

    const { fields } = body;

    // ── 3. Validasi Struktur fields ─────────────────────────────────────────
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      return NextResponse.json(
        { error: "Data tidak valid. Field harus berupa objek key-value." },
        { status: 400 }
      );
    }

    const fieldEntries = Object.entries(fields);

    if (fieldEntries.length === 0) {
      return NextResponse.json(
        { error: "Data tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (fieldEntries.length > MAX_FIELDS) {
      return NextResponse.json(
        { error: `Terlalu banyak field. Maksimal ${MAX_FIELDS} field per submit.` },
        { status: 400 }
      );
    }

    // ── 4. Validasi Tipe & Panjang Nilai ────────────────────────────────────
    const sanitizedFields = {};
    const emptyFields = [];

    for (const [key, val] of fieldEntries) {
      // Key harus string sederhana (cegah prototype pollution)
      if (
        typeof key !== "string" ||
        key === "__proto__" ||
        key === "constructor" ||
        key === "prototype"
      ) {
        return NextResponse.json(
          { error: "Nama field tidak valid." },
          { status: 400 }
        );
      }

      // Value harus string atau number (bukan object/array)
      if (typeof val === "object" || typeof val === "function") {
        return NextResponse.json(
          { error: `Nilai untuk field "${key}" harus berupa teks atau angka.` },
          { status: 400 }
        );
      }

      const strVal = String(val ?? "").trim();

      // Cek panjang
      if (strVal.length > MAX_VALUE_LENGTH) {
        return NextResponse.json(
          { error: `Nilai untuk field "${key}" terlalu panjang (maks ${MAX_VALUE_LENGTH} karakter).` },
          { status: 400 }
        );
      }

      if (strVal === "") {
        emptyFields.push(key);
      } else {
        sanitizedFields[key] = strVal;
      }
    }

    if (emptyFields.length > 0) {
      return NextResponse.json(
        { error: `Mohon lengkapi semua field: ${emptyFields.join(", ")}` },
        { status: 400 }
      );
    }

    // ── 5. Validasi Kredensial Ada ──────────────────────────────────────────
    if (
      !process.env.GOOGLE_CLIENT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY ||
      !process.env.GOOGLE_SHEET_ID
    ) {
      console.error("Kredensial Google tidak lengkap di environment.");
      return NextResponse.json(
        { error: "Layanan sedang tidak tersedia. Hubungi administrator." },
        { status: 503 }
      );
    }

    // ── 6. Autentikasi & Submit ke Google Sheets ────────────────────────────
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    const headerRowIndex = parseInt(process.env.GOOGLE_HEADER_ROW || "1", 10);
    await sheet.loadHeaderRow(headerRowIndex);

    await sheet.addRow(sanitizedFields);

    return NextResponse.json(
      { success: true, message: "Data berhasil disimpan ke Google Sheets." },
      { status: 200 }
    );

  } catch (error) {
    // Log detail error di server — jangan bocorkan ke client
    console.error("[submit] Internal error:", error.message);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyimpan data. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
