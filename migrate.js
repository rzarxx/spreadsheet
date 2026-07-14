require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to Supabase.");

    const query = `
      CREATE TABLE IF NOT EXISTS "SheetConfig" (
        "id" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "clientEmail" TEXT NOT NULL,
        "privateKey" TEXT NOT NULL,
        "sheetId" TEXT NOT NULL,
        "headerRow" INTEGER NOT NULL DEFAULT 1,
        "startColumn" TEXT NOT NULL DEFAULT 'A',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "SheetConfig_pkey" PRIMARY KEY ("id")
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "SheetConfig_token_key" ON "SheetConfig"("token");
    `;

    await client.query(query);
    console.log("Table SheetConfig created successfully!");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await client.end();
  }
}

migrate();
