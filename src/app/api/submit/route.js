import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  if (rateLimitMap.size > 500) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (val.every((t) => now - t >= RATE_WINDOW_MS)) rateLimitMap.delete(key);
    }
  }
  return false;
}

const MAX_FIELDS = 50;
const MAX_VALUE_LENGTH = 1000;

/**
 * Helper: fetch config for a token
 */
async function getConfigForToken(token) {
  if (!token) return null;
  const cfg = await prisma.sheetConfig.findUnique({ where: { token } });
  return cfg;
}

/**
 * POST /api/submit
 * Expects Authorization: Bearer <token> header.
 */
export async function POST(request) {
  try {
    // ── 1. Rate Limiting ──────────────────────────────────────────────────────
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

    // ── 2. Parse Body ─────────────────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 });
    }

    const { fields } = body;

    // ── 3. Validasi Struktur ──────────────────────────────────────────────────
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      return NextResponse.json(
        { error: "Data tidak valid. Field harus berupa objek key-value." },
        { status: 400 }
      );
    }

    const fieldEntries = Object.entries(fields);

    if (fieldEntries.length === 0) {
      return NextResponse.json({ error: "Data tidak boleh kosong." }, { status: 400 });
    }
    if (fieldEntries.length > MAX_FIELDS) {
      return NextResponse.json(
        { error: `Terlalu banyak field. Maksimal ${MAX_FIELDS}.` },
        { status: 400 }
      );
    }

    // ── 4. Validasi & Sanitasi Nilai ──────────────────────────────────────────
    const sanitizedFields = {};
    const emptyFields = [];

    for (const [key, val] of fieldEntries) {
      // Cegah prototype pollution
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return NextResponse.json({ error: "Nama field tidak valid." }, { status: 400 });
      }
      if (typeof val === "object" || typeof val === "function") {
        return NextResponse.json(
          { error: `Nilai untuk field "${key}" harus teks atau angka.` },
          { status: 400 }
        );
      }

      const strVal = String(val ?? "").trim();

      if (strVal.length > MAX_VALUE_LENGTH) {
        return NextResponse.json(
          { error: `Nilai "${key}" terlalu panjang (maks ${MAX_VALUE_LENGTH} karakter).` },
          { status: 400 }
        );
      }

      if (strVal !== "") {
        sanitizedFields[key] = strVal;
      } else {
        sanitizedFields[key] = ""; // Allow empty values
      }
    }

    // ── 5. Token & Validasi Kredensial ────────────────────────────────────────
    const authHeader = request.headers.get("authorization");
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!token) {
      return NextResponse.json({ error: "Token akses tidak ditemukan. Silakan login." }, { status: 401 });
    }

    const config = await getConfigForToken(token);
    if (!config) {
      return NextResponse.json({ error: "Token tidak valid." }, { status: 401 });
    }

    if (!config.clientEmail || !config.privateKey || !config.sheetId) {
      return NextResponse.json(
        { error: "Kredensial Google belum dikonfigurasi. Silakan lengkapi di menu Pengaturan." },
        { status: 400 }
      );
    }

    // ── 6. Autentikasi ────────────────────────────────────────────────────────
    const serviceAccountAuth = new JWT({
      email: config.clientEmail,
      key: config.privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // ── 7. Load Info & Header ─────────────────────────────────────────────────
    const doc = new GoogleSpreadsheet(config.sheetId, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    const headerRowIndex = parseInt(config.headerRow || "1", 10); // 1-based

    await sheet.loadHeaderRow(headerRowIndex);

    // Hitung index kolom (A=0, B=1, dst)
    const startColStr = (config.startColumn || "A").toUpperCase();
    let startColIdx = 0;
    for (let i = 0; i < startColStr.length; i++) {
      startColIdx = startColIdx * 26 + (startColStr.charCodeAt(i) - 64);
    }
    startColIdx -= 1; // 0-based

    // Ambil header HANYA mulai dari kolom startColStr
    const headersToMap = sheet.headerValues.slice(startColIdx);

    if (headersToMap.filter((h) => h && h.trim() !== "").length === 0) {
      return NextResponse.json(
        { error: "Header spreadsheet tidak ditemukan. Periksa konfigurasi Header Row dan Start Column." },
        { status: 422 }
      );
    }

    // ── 8. Susun Data sesuai Urutan Kolom Header ──────────────────────────────
    // Setiap nilai dimasukkan ke posisi kolom yang TEPAT sesuai header.
    // Kolom kosong (blank column) tetap dipertahankan posisinya sebagai "".
    const orderedValues = headersToMap.map((header) => {
      if (!header || header.trim() === "") return "";
      return sanitizedFields[header] ?? "";
    });

    // ── 9. Dapatkan Access Token untuk Sheets API ─────────────────────────────
    const tokenResponse = await serviceAccountAuth.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      throw new Error("Gagal mendapatkan access token.");
    }

    // ── 10. Tulis ke Sheet via Sheets REST API langsung ───────────────────────
    //
    // KRITIS: Range dimulai dari kolom dan baris yang benar.
    // Contoh: startColStr="B", headerRowIndex=5 -> Range: Sheet1!B6
    //
    const firstDataRow = headerRowIndex + 1; // baris pertama data (di bawah header)
    const rangeParam = encodeURIComponent(`${sheet.title}!${startColStr}${firstDataRow}`);
    const sheetsApiUrl =
      `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}` +
      `/values/${rangeParam}:append` +
      `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const sheetsResponse = await fetch(sheetsApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [orderedValues],
      }),
    });

    if (!sheetsResponse.ok) {
      const errData = await sheetsResponse.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Sheets API error ${sheetsResponse.status}`;
      console.error("[submit] Sheets API error:", errMsg);
      throw new Error(errMsg);
    }

    return NextResponse.json(
      { success: true, message: "Data berhasil disimpan ke Google Sheets." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[submit] Internal error:", error.message);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyimpan data. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
