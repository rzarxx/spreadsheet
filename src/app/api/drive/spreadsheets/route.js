import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { google } from "googleapis";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!dbUser?.accessToken) {
      return NextResponse.json({ error: "No Google access token found" }, { status: 403 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: dbUser.accessToken });

    const drive = google.drive({ version: 'v3', auth });
    
    // Fetch user's spreadsheets
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'files(id, name, modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 50, // Limit to 50 for performance
    });

    return NextResponse.json({ files: response.data.files });
  } catch (error) {
    console.error("Error fetching spreadsheets from drive:", error);
    return NextResponse.json({ error: "Failed to fetch spreadsheets from Google Drive" }, { status: 500 });
  }
}
