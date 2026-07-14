import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { google } from "googleapis";

export async function GET(request, { params }) {
  try {
    const projectId = params.projectId;
    const { searchParams } = new URL(request.url);
    const rowNum = searchParams.get("row"); // optional

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { user: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project tidak ditemukan" }, { status: 404 });
    }

    if (!project.user?.accessToken) {
      return NextResponse.json({ error: "Kredensial pemilik project tidak valid" }, { status: 403 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: project.user.accessToken });
    const sheets = google.sheets({ version: "v4", auth });

    // Fetch sheet metadata and headers
    const metadataRes = await sheets.spreadsheets.get({
      spreadsheetId: project.sheetId,
    });
    const sheetTitle = metadataRes.data.properties.title;
    const firstSheetName = metadataRes.data.sheets[0].properties.title;

    const headerRange = `${firstSheetName}!${project.startColumn}${project.headerRow}:${project.headerRow}`;
    let dataRange = "";
    if (rowNum) {
      dataRange = `${firstSheetName}!${project.startColumn}${rowNum}:${rowNum}`;
    }

    const ranges = [headerRange];
    if (rowNum) ranges.push(dataRange);

    const batchRes = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: project.sheetId,
      ranges: ranges,
    });

    const headerValues = batchRes.data.valueRanges[0].values;
    if (!headerValues || headerValues.length === 0) {
      return NextResponse.json({ error: "Baris header tidak ditemukan" }, { status: 400 });
    }
    const headers = headerValues[0].filter((h) => h !== "");

    // Fetch validation rules (dropdowns)
    const validRes = await sheets.spreadsheets.get({
      spreadsheetId: project.sheetId,
      ranges: [`${firstSheetName}!${project.startColumn}${project.headerRow + 1}:Z${project.headerRow + 1}`],
      includeGridData: true,
    });

    const fieldOptions = {};
    const rowData = validRes.data.sheets[0].data[0].rowData;
    if (rowData && rowData[0] && rowData[0].values) {
      const cells = rowData[0].values;
      headers.forEach((header, index) => {
        if (cells[index] && cells[index].dataValidation) {
          const condition = cells[index].dataValidation.condition;
          if (condition.type === "ONE_OF_LIST") {
            fieldOptions[header] = condition.values.map(v => v.userEnteredValue);
          }
        }
      });
    }

    let editData = null;
    if (rowNum && batchRes.data.valueRanges.length > 1) {
      const rowValues = batchRes.data.valueRanges[1].values;
      if (rowValues && rowValues.length > 0) {
        editData = {};
        headers.forEach((header, index) => {
          editData[header] = rowValues[0][index] || "";
        });
      }
    }

    return NextResponse.json({
      sheetTitle,
      headers,
      fieldOptions,
      editData
    });
  } catch (error) {
    console.error("Error fetching form data:", error);
    return NextResponse.json({ error: "Gagal memuat data formulir" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const projectId = params.projectId;
    const body = await request.json();
    const { fields, row } = body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { user: true },
    });

    if (!project || !project.user?.accessToken) {
      return NextResponse.json({ error: "Project atau kredensial tidak valid" }, { status: 404 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: project.user.accessToken });
    const sheets = google.sheets({ version: "v4", auth });

    // Fetch header mapping
    const metadataRes = await sheets.spreadsheets.get({
      spreadsheetId: project.sheetId,
    });
    const firstSheetName = metadataRes.data.sheets[0].properties.title;
    
    const headerRange = `${firstSheetName}!${project.startColumn}${project.headerRow}:${project.headerRow}`;
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: project.sheetId,
      range: headerRange,
    });
    
    const headers = headerRes.data.values[0];
    const values = headers.map(header => fields[header] || "");

    if (row) {
      // Update existing row
      const updateRange = `${firstSheetName}!${project.startColumn}${row}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: project.sheetId,
        range: updateRange,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [values],
        },
      });
    } else {
      // Append new row
      const appendRange = `${firstSheetName}!${project.startColumn}${project.headerRow + 1}`;
      await sheets.spreadsheets.values.append({
        spreadsheetId: project.sheetId,
        range: appendRange,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [values],
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error submitting form:", error);
    return NextResponse.json({ error: "Gagal mengirim data" }, { status: 500 });
  }
}
