import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { products, expenses, invoices, users, auditLogs } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { eq } from 'drizzle-orm';

export const getDashboardData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  // Concurrently fetch all backend datasets needed for the dashboard based on role privacy
  let productsPromise;
  let expensesPromise;
  let invoicesPromise;
  let logsPromise;

  if (user.role === 'Admin') {
    productsPromise = db.select().from(products);
    expensesPromise = db.select().from(expenses);
    invoicesPromise = db.query.invoices.findMany({
      with: {
        items: true,
      },
    });
    logsPromise = db.select().from(auditLogs);
  } else {
    productsPromise = db.select().from(products).where(eq(products.createdBy, user.id));
    expensesPromise = db.select().from(expenses).where(eq(expenses.createdBy, user.id));
    invoicesPromise = db.query.invoices.findMany({
      where: eq(invoices.createdBy, user.id),
      with: {
        items: true,
      },
    });
    logsPromise = db.select().from(auditLogs).where(eq(auditLogs.userEmail, user.email));
  }

  const [allProducts, allExpenses, allInvoices, allUsers, allLogs] = await Promise.all([
    productsPromise,
    expensesPromise,
    invoicesPromise,
    db.select().from(users),
    logsPromise,
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

