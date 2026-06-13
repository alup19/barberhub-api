import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env["DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: connectionString,
    pool: new pg.Pool({ connectionString }),
    adapter: new PrismaPg({ pool: new pg.Pool({ connectionString }) }),
  },
});