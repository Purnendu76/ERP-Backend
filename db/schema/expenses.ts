import { pgTable, uuid, text, doublePrecision, timestamp } from 'drizzle-orm/pg-core';

export const expenses = pgTable('expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(), // 'Office Supplies' | 'Travel' | 'Food' | 'Software' | 'Marketing' | 'Utilities' | 'Other'
  amount: doublePrecision('amount').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'Cash' | 'Bank Transfer' | 'Credit Card' | 'UPI' | 'Other'
  expenseDate: timestamp('expense_date').notNull(),
  submittedBy: text('submitted_by').notNull(), // name or user id
  status: text('status').default('Pending').notNull(), // 'Pending' | 'Approved' | 'Rejected'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
