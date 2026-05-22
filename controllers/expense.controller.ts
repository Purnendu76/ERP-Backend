import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { expenses } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { redisClient } from '../config/redis.js';

export const getExpenses = async (req: Request, res: Response) => {
  try {
    // Attempt to get from Redis cache
    try {
      const cachedExpenses = await redisClient.get("expenses:all");
      if (cachedExpenses) {
        res.status(200).json(JSON.parse(cachedExpenses));
        return;
      }
    } catch (redisError) {
      console.error("Redis error in getExpenses:", redisError);
    }

    const allExpenses = await db.select().from(expenses);

    // Save to Redis cache
    try {
      await redisClient.set("expenses:all", JSON.stringify(allExpenses), {
        EX: 3600, // 1 hour TTL
      });
    } catch (redisError) {
      console.error("Redis save error in getExpenses:", redisError);
    }

    res.status(200).json(allExpenses);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const createExpense = async (req: Request, res: Response) => {
  try {
    const { title, category, amount, paymentMethod, expenseDate, submittedBy, status } = req.body;

    if (!title || !category || amount === undefined || !paymentMethod || !expenseDate || !submittedBy) {
      res.status(400).json({ error: 'All fields (title, category, amount, paymentMethod, expenseDate, submittedBy) are required' });
      return;
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount)) {
      res.status(400).json({ error: 'Amount must be a valid number' });
      return;
    }

    const parsedDate = new Date(expenseDate);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({ error: 'Invalid expenseDate format' });
      return;
    }

    const [newExpense] = await db.insert(expenses).values({
      title,
      category,
      amount: parsedAmount,
      paymentMethod,
      expenseDate: parsedDate,
      submittedBy,
      status: status || 'Pending',
    }).returning();

    // Invalidate Redis cache
    try {
      await redisClient.del("expenses:all");
    } catch (redisError) {
      console.error("Redis clear error in createExpense:", redisError);
    }

    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updates = req.body;

    if (updates.amount !== undefined) {
      const parsedAmount = Number(updates.amount);
      if (isNaN(parsedAmount)) {
        res.status(400).json({ error: 'Amount must be a valid number' });
        return;
      }
      updates.amount = parsedAmount;
    }

    if (updates.expenseDate !== undefined) {
      const parsedDate = new Date(updates.expenseDate);
      if (isNaN(parsedDate.getTime())) {
        res.status(400).json({ error: 'Invalid expenseDate format' });
        return;
      }
      updates.expenseDate = parsedDate;
    }

    const [updatedExpense] = await db.update(expenses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();

    if (!updatedExpense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    // Invalidate Redis cache
    try {
      await redisClient.del("expenses:all");
    } catch (redisError) {
      console.error("Redis clear error in updateExpense:", redisError);
    }

    res.status(200).json(updatedExpense);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.delete(expenses).where(eq(expenses.id, id));

    // Invalidate Redis cache
    try {
      await redisClient.del("expenses:all");
    } catch (redisError) {
      console.error("Redis clear error in deleteExpense:", redisError);
    }

    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};
