import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Uses Neon's HTTP driver — ideal for serverless/edge functions on Vercel.
// No persistent TCP connections, so no connection-pool exhaustion issues.
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
