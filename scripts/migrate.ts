import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const connectionUrl: string = DATABASE_URL;

const migrationsDir = path.resolve(process.cwd(), "db/migrations");

async function main() {
  const sql = postgres(connectionUrl, { max: 1, prepare: false });
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const applied = await sql<{ id: string }[]>`
        SELECT id FROM schema_migrations WHERE id = ${file}
      `;
      if (applied.length > 0) {
        console.log(`skip ${file}`);
        continue;
      }

      const sqlText = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(sqlText);
        await tx`INSERT INTO schema_migrations (id) VALUES (${file})`;
      });
      console.log(`applied ${file}`);
    }

    console.log("migrations complete");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
