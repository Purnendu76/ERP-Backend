import { pgTable, uuid, text, integer, doublePrecision, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.js';

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceNumber: text('invoice_number').unique().notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  invoiceDate: timestamp('invoice_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  taxRate: doublePrecision('tax_rate').default(18).notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
  tax: doublePrecision('tax').notNull(),
  total: doublePrecision('total').notNull(),
  status: text('status').default('Pending').notNull(), // 'Paid' | 'Pending' | 'Overdue' | 'Cancelled'
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  itemName: text('item_name').notNull(),
  quantity: integer('quantity').notNull(),
  price: doublePrecision('price').notNull(),
  total: doublePrecision('total').notNull(),
});

export const invoicesRelations = relations(invoices, ({ many }) => ({
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));
