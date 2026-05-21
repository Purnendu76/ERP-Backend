import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  action: text('action').notNull(), // 'CREATE' | 'UPDATE' | 'DELETE' | etc.
  entity: text('entity').notNull(), // 'User' | 'Product' | 'Expense' | 'Invoice' | etc.
  userName: text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  ipAddress: text('ip_address').notNull(),
  details: text('details').notNull(),
});
