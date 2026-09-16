import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

// Analytics observations. SQL views in 0003_analytics.sql calculate performance
// directly from these inputs. Use reviewed SQL migrations for view changes.
export const researchMembers = sqliteTable("research_members", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  stateDistrict: text("state_district").notNull().default(""),
  indexedFilingCount: integer("indexed_filing_count").notNull(),
});
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull().references(() => researchMembers.id),
  ticker: text("ticker").notNull(),
  instrument: text("instrument").notNull(),
  direction: text("direction").notNull(),
  action: text("action").notNull(),
  closeKind: text("close_kind"),
  expirationDate: text("expiration_date"),
  strike: text("strike"),
  transactionDate: text("transaction_date").notNull(),
  filingId: text("filing_id").notNull(),
  payload: text("payload").notNull(),
}, (table) => [index("transactions_member_date").on(table.memberId,table.transactionDate,table.id)]);
export const priceHistory = sqliteTable("price_history", {
  ticker: text("ticker").notNull(),
  date: text("date").notNull(),
  adjustedClose: real("adjusted_close").notNull(),
}, (table) => [primaryKey({columns:[table.ticker,table.date]})]);
export const datasetImports = sqliteTable("dataset_imports", {
  id: integer("id").primaryKey(),
  importedAt: text("imported_at").notNull(),
  sourceGeneratedAt: text("source_generated_at").notNull(),
  sourceStartYear: integer("source_start_year").notNull(),
  sourceEndYear: integer("source_end_year").notNull(),
  readablePtrCount: integer("readable_ptr_count").notNull(),
  methodology: text("methodology").notNull(),
});
