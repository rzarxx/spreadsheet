// src/app/api/config/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET config for token (Authorization: Bearer <token>)
 * Returns safe config (without privateKey) so frontend can display current values.
 */
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }
  const cfg = await prisma.sheetConfig.findUnique({ where: { token } });
  if (!cfg) {
    return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 404 });
  }
  const { privateKey, ...safe } = cfg;
  return NextResponse.json({ config: safe }, { status: 200 });
}

/**
 * POST update config for token. Body must include token and fields to update.
 * Allowed fields: clientEmail, privateKey, sheetId, headerRow, startColumn.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, clientEmail, privateKey, sheetId, headerRow, startColumn } = body;
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    const existing = await prisma.sheetConfig.findUnique({ where: { token } });
    if (!existing) {
      return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 404 });
    }
    const data = {};
    if (clientEmail !== undefined) data.clientEmail = clientEmail;
    if (privateKey !== undefined) data.privateKey = privateKey;
    if (sheetId !== undefined) data.sheetId = sheetId;
    if (headerRow !== undefined) data.headerRow = Number(headerRow);
    if (startColumn !== undefined) data.startColumn = startColumn;
    const updated = await prisma.sheetConfig.update({ where: { token }, data });
    const { privateKey: _, ...safe } = updated;
    return NextResponse.json({ config: safe }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
