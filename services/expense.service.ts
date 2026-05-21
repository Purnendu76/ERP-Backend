import { db } from '../db/index.js';
import { expenses } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class ExpenseService {
  static async listExpenses() {
    return await db.select().from(expenses);
  }

  static async createExpense(expenseData: typeof expenses.$inferInsert) {
    const [newExpense] = await db.insert(expenses).values(expenseData).returning();
    return newExpense;
  }

  static async updateExpense(id: string, updates: Partial<typeof expenses.$inferInsert>) {
    const [updatedExpense] = await db.update(expenses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  static async deleteExpense(id: string) {
    await db.delete(expenses).where(eq(expenses.id, id));
    return true;
  }
}
