import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  role: text('role').default('Staff').notNull(), // 'Admin' | 'Manager' | 'Staff'
  status: text('status').default('Active').notNull(), // 'Active' | 'Inactive'
  photo: text('photo'), // base64 or url
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
