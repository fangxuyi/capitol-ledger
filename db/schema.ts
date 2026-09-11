import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const trackedMembers = sqliteTable("tracked_members", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  displayName: text("display_name").notNull(),
  chamber: text("chamber").notNull().default("house"),
  stateDistrict: text("state_district"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const filings = sqliteTable("filings", {
  docId: text("doc_id").primaryKey(),
  memberId: text("member_id").notNull(),
  filingType: text("filing_type").notNull(),
  filingYear: integer("filing_year").notNull(),
  filedAt: text("filed_at").notNull(),
  sourceIndexUrl: text("source_index_url").notNull(),
  sourcePdfUrl: text("source_pdf_url").notNull(),
  discoveredAt: text("discovered_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const alertRules = sqliteTable("alert_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").notNull(),
  ruleType: text("rule_type").notNull(),
  thresholdCents: integer("threshold_cents"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_alert_rules_member_type").on(table.memberId, table.ruleType),
]);

export const syncRuns = sqliteTable("sync_runs", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
  status: text("status").notNull(),
  filingCount: integer("filing_count").notNull().default(0),
  error: text("error"),
});
