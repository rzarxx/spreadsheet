import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    has_GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    has_GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    has_NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    has_NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_value: process.env.NEXTAUTH_URL || "null",
    has_DATABASE_URL: !!process.env.DATABASE_URL,
    has_DIRECT_URL: !!process.env.DIRECT_URL,
  });
}
