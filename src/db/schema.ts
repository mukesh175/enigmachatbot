import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  index,
  uniqueIndex,
  real,
  date,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*  CLIENTS (tenants) — each client = one company using the platform          */
/* -------------------------------------------------------------------------- */
export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  plan: varchar("plan", { length: 50 }).default("free").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("clients_email_idx").on(table.email),
}));

/* -------------------------------------------------------------------------- */
/*  TEAM_MEMBERS — additional logins under a client (organization).           */
/*  role "admin" = full access (same as the original owner account).          */
/*  role "member" = can view leads/analytics and update lead status only —    */
/*  cannot delete leads, manage campaigns, or manage the team.                */
/* -------------------------------------------------------------------------- */
export const teamMembers = pgTable("team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).default("member").notNull(), // "admin" | "member"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("team_members_email_idx").on(table.email),
  clientIdx: index("team_members_client_idx").on(table.clientId),
}));

/* -------------------------------------------------------------------------- */
/*  CAMPAIGNS — each client can run multiple bot campaigns                    */
/* -------------------------------------------------------------------------- */
export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  embedKey: varchar("embed_key", { length: 32 }).notNull(), // used in widget script tag
  status: varchar("status", { length: 20 }).default("active").notNull(), // active | paused | archived
  botConfig: jsonb("bot_config").default({}).notNull(), // greeting, questions, theme colors, logo url
  allowedDomains: text("allowed_domains").array().default([]).notNull(), // domain whitelist for embed security
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  clientIdx: index("campaigns_client_idx").on(table.clientId),
  embedKeyIdx: uniqueIndex("campaigns_embed_key_idx").on(table.embedKey),
}));

/* -------------------------------------------------------------------------- */
/*  CONVERSATIONS — one row per visitor chat session                          */
/* -------------------------------------------------------------------------- */
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }).notNull(),
  visitorId: varchar("visitor_id", { length: 64 }).notNull(), // anonymous cookie/localStorage id

  // Tracking data captured on session start
  ipAddress: varchar("ip_address", { length: 64 }),
  city: varchar("city", { length: 120 }),
  region: varchar("region", { length: 120 }),
  country: varchar("country", { length: 120 }),
  network: varchar("network", { length: 255 }), // ISP name, backfilled async
  userAgent: text("user_agent"),
  referrerUrl: text("referrer_url"),
  pageUrl: text("page_url"),

  // Traffic source attribution — lets clients see whether a chat came from
  // Google Ads, Meta/Facebook Ads, organic search, or direct/unknown.
  utmSource: varchar("utm_source", { length: 120 }),
  utmMedium: varchar("utm_medium", { length: 120 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  trafficSource: varchar("traffic_source", { length: 50 }), // "google_ads" | "meta_ads" | "organic_search" | "organic_social" | "direct" | "other"

  startedAt: timestamp("started_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(), // updated via heartbeat
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds").default(0).notNull(),

  converted: boolean("converted").default(false).notNull(), // became a lead?
}, (table) => ({
  campaignIdx: index("conversations_campaign_idx").on(table.campaignId),
  startedAtIdx: index("conversations_started_at_idx").on(table.startedAt),
}));

/* -------------------------------------------------------------------------- */
/*  MESSAGES — individual chat turns                                         */
/* -------------------------------------------------------------------------- */
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  sender: varchar("sender", { length: 10 }).notNull(), // "bot" | "visitor"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  conversationIdx: index("messages_conversation_idx").on(table.conversationId),
}));

/* -------------------------------------------------------------------------- */
/*  LEADS — captured contact info from a conversation                        */
/* -------------------------------------------------------------------------- */
export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),

  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  customFields: jsonb("custom_fields").default({}).notNull(), // any extra Q&A captured

  status: varchar("status", { length: 20 }).default("new").notNull(), // new | contacted | converted | rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  clientIdx: index("leads_client_idx").on(table.clientId),
  campaignIdx: index("leads_campaign_idx").on(table.campaignId),
  createdAtIdx: index("leads_created_at_idx").on(table.createdAt),
}));

/* -------------------------------------------------------------------------- */
/*  ANALYTICS_DAILY — pre-aggregated rollups so dashboard queries stay fast  */
/*  Populated by a nightly/hourly Vercel Cron job, never queried live tables */
/* -------------------------------------------------------------------------- */
export const analyticsDaily = pgTable("analytics_daily", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  totalChats: integer("total_chats").default(0).notNull(),
  totalLeads: integer("total_leads").default(0).notNull(),
  avgDurationSeconds: real("avg_duration_seconds").default(0).notNull(),
  conversionRate: real("conversion_rate").default(0).notNull(),
}, (table) => ({
  campaignDateIdx: uniqueIndex("analytics_campaign_date_idx").on(table.campaignId, table.date),
}));
