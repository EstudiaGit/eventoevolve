// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "pg", // PostgreSQL (no SQLite)
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
