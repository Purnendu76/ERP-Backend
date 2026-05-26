import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { products, expenses, invoices, users, auditLogs } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDashboardData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Concurrently fetch all backend datasets needed for the dashboard
  const [allProducts, allExpenses, allInvoices, allUsers, allLogs] = await Promise.all([
    db.select().from(products),
    db.select().from(expenses),
    db.query.invoices.findMany({
      with: {
        items: true,
      },
    }),
    db.select().from(users),
    db.select().from(auditLogs),
  ]);

  // Sanitize users to remove sensitive password hashes
  const sanitizedUsers = allUsers.map(({ password: _, ...userWithoutPassword }) => userWithoutPassword);

  res.status(200).json({
    products: allProducts,
    expenses: allExpenses,
    invoices: allInvoices,
    users: sanitizedUsers,
    auditLogs: allLogs,
  });
});

