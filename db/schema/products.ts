import { pgTable, uuid, text, integer, doublePrecision, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').unique().notNull(),
  category: text('category').notNull(),
  price: doublePrecision('price').notNull(),
  stock: integer('stock').default(0).notNull(),
  status: text('status').default('In Stock').notNull(), // 'In Stock' | 'Low Stock' | 'Out of Stock'
  image: text('image'), // base64 or url
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
