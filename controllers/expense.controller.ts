import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { expenses } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const allExpenses = await db.select().from(expenses);
    res.status(200).json(allExpenses);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const createExpense = async (req: Request, res: Response) => {
  try {
    const { title, category, amount, paymentMethod, expenseDate, submittedBy, status } = req.body;
    const [newExpense] = await db.insert(expenses).values({
      title,
      category,
      amount,
      paymentMethod,
      expenseDate: new Date(expenseDate),
      submittedBy,
      status,
    }).returning();

    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updates = req.body;
    if (updates.expenseDate) {
      updates.expenseDate = new Date(updates.expenseDate);
    }
    const [updatedExpense] = await db.update(expenses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();

    res.status(200).json(updatedExpense);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.delete(expenses).where(eq(expenses.id, id));
    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};
