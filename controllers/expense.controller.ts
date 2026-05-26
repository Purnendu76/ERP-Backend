import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { expenses } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { redisClient } from '../config/redis.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getExpenses = asyncHandler(async (req: Request, res: Response) => {
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
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const { title, category, amount, paymentMethod, expenseDate, submittedBy, status } = req.body;

  if (!title || !category || amount === undefined || !paymentMethod || !expenseDate || !submittedBy) {
    throw AppError.badRequest('All fields (title, category, amount, paymentMethod, expenseDate, submittedBy) are required', 'MISSING_FIELDS');
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount)) {
    throw AppError.badRequest('Amount must be a valid number', 'INVALID_AMOUNT');
  }

  const parsedDate = new Date(expenseDate);
  if (isNaN(parsedDate.getTime())) {
    throw AppError.badRequest('Invalid expenseDate format', 'INVALID_DATE');
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
});

export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updates = req.body;

  if (updates.amount !== undefined) {
    const parsedAmount = Number(updates.amount);
    if (isNaN(parsedAmount)) {
      throw AppError.badRequest('Amount must be a valid number', 'INVALID_AMOUNT');
    }
    updates.amount = parsedAmount;
  }

  if (updates.expenseDate !== undefined) {
    const parsedDate = new Date(updates.expenseDate);
    if (isNaN(parsedDate.getTime())) {
      throw AppError.badRequest('Invalid expenseDate format', 'INVALID_DATE');
    }
    updates.expenseDate = parsedDate;
  }

  const [updatedExpense] = await db.update(expenses)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(expenses.id, id))
    .returning();

  if (!updatedExpense) {
    throw AppError.notFound('Expense not found', 'EXPENSE_NOT_FOUND');
  }

  // Invalidate Redis cache
  try {
    await redisClient.del("expenses:all");
  } catch (redisError) {
    console.error("Redis clear error in updateExpense:", redisError);
  }

  res.status(200).json(updatedExpense);
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  
  const [existing] = await db.select().from(expenses).where(eq(expenses.id, id));
  if (!existing) {
    throw AppError.notFound('Expense not found', 'EXPENSE_NOT_FOUND');
  }

  await db.delete(expenses).where(eq(expenses.id, id));

  // Invalidate Redis cache
  try {
    await redisClient.del("expenses:all");
  } catch (redisError) {
    console.error("Redis clear error in deleteExpense:", redisError);
  }

  res.status(200).json({ message: 'Expense deleted successfully' });
});

