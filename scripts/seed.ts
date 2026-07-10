/**
 * Run with: npx tsx scripts/seed.ts
 * Creates one test client + one active campaign so you can log in
 * and test the widget immediately without going through signup manually.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const email = "demo@leadbot.test";
  const password = "demo1234";

  const existing = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.email, email))
    .limit(1);

  let clientId: string;

  if (existing.length > 0) {
    clientId = existing[0].id;
    console.log("Demo client already exists, reusing it.");
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const [client] = await db
      .insert(schema.clients)
      .values({ name: "Demo Company", email, passwordHash })
      .returning();
    clientId = client.id;
    console.log("Created demo client.");
  }

  const existingCampaign = await db
    .select()
    .from(schema.campaigns)
    .where(eq(schema.campaigns.clientId, clientId))
    .limit(1);

  let embedKey: string;

  if (existingCampaign.length > 0) {
    embedKey = existingCampaign[0].embedKey;
    console.log("Demo campaign already exists, reusing it.");
  } else {
    embedKey = nanoid(20);
    await db.insert(schema.campaigns).values({
      clientId,
      name: "Demo Landing Page",
      embedKey,
      status: "active",
      botConfig: {
        theme: "#6d3ef7",
        flow: [
          {
            id: "welcome",
            type: "message",
            message: "Hey there! 👋 Thanks for stopping by our page.",
          },
          {
            id: "intent",
            type: "choice",
            message: "What are you looking to do today?",
            image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=500",
            options: [
              { label: "Buy a product", value: "buy", next: "budget" },
              { label: "Just browsing", value: "browse", next: "contact" },
              { label: "Need support", value: "support", next: "contact" },
            ],
          },
          {
            id: "budget",
            type: "choice",
            message: "Nice! What's your budget range?",
            options: [
              { label: "Under $500", value: "low" },
              { label: "$500 - $2000", value: "mid" },
              { label: "$2000+", value: "high" },
            ],
            next: "contact",
          },
          {
            id: "contact",
            type: "contact",
            message: "Great, one last step — leave your email and WhatsApp number and our team will follow up shortly.",
          },
        ],
      },
    });
    console.log("Created demo campaign.");
  }

  console.log("\n--------------------------------------------------");
  console.log("Login at http://localhost:3000/login with:");
  console.log("  email:    ", email);
  console.log("  password: ", password);
  console.log("\nEmbed snippet (paste on any test HTML page):");
  console.log(
    `  <script src="http://localhost:3000/widget.js" data-embed-key="${embedKey}" async></script>`
  );
  console.log("--------------------------------------------------\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
