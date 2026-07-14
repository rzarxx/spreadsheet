// src/app/api/auth/register/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

export async function POST(request) {
  try {
    const { token: customToken } = await request.json();
    let token = customToken?.trim();
    if (!token) {
      // generate random token (UUID v4)
      token = crypto.randomUUID();
    }
    // ensure uniqueness
    const existing = await prisma.sheetConfig.findUnique({ where: { token } });
    if (existing) {
      return NextResponse.json({ error: "Token already exists" }, { status: 409 });
    }
    // create empty config for this token (fields will be filled later)
    await prisma.sheetConfig.create({
      data: {
        token,
        clientEmail: "",
        privateKey: "",
        sheetId: "",
        headerRow: 1,
        startColumn: "A",
      },
    });
    return NextResponse.json({ token }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
