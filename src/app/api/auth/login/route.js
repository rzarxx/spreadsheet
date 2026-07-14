// src/app/api/auth/login/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

export async function POST(request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    const config = await prisma.sheetConfig.findUnique({ where: { token } });
    if (!config) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    // Do not expose privateKey in response
    const { privateKey, ...safeConfig } = config;
    return NextResponse.json({ config: safeConfig }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
