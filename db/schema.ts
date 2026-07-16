import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().default("demo"),
  serviceId: text("service_id").notNull(),
  serviceTitle: text("service_title").notNull(),
  feature: text("feature").notNull(),
  action: text("action").notNull(),
  amount: integer("amount").notNull(),
  permission: text("permission").notNull(),
  status: text("status").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const actionRequests = sqliteTable("action_requests", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().default("demo"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  serviceId: text("service_id").notNull(),
  serviceTitle: text("service_title").notNull(),
  feature: text("feature").notNull(),
  action: text("action").notNull(),
  amount: integer("amount").notNull(),
  permission: text("permission").notNull(),
  operation: text("operation").notNull(),
  adapter: text("adapter").notNull(),
  status: text("status").notNull(),
  code: text("code").notNull(),
  detail: text("detail").notNull(),
  externalRef: text("external_ref").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().default("demo"),
  objectKey: text("object_key").notNull().unique(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  sha256: text("sha256").notNull(),
  status: text("status").notNull(),
  extractedLength: integer("extracted_length").notNull().default(0),
  preview: text("preview").notNull().default(""),
  signalsJson: text("signals_json").notNull().default("{}"),
  serviceId: text("service_id").notNull().default("contract"),
  feature: text("feature").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
