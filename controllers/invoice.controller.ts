import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { invoices, invoiceItems } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { redisClient } from '../config/redis.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const cacheKey = user.role === "Admin" ? "invoices:all:admin" : `invoices:all:${user.id}`;

  // Attempt to get from Redis cache
  try {
    const cachedInvoices = await redisClient.get(cacheKey);
    if (cachedInvoices) {
      res.status(200).json(JSON.parse(cachedInvoices));
      return;
    }
  } catch (redisError) {
    console.error("Redis error in getInvoices:", redisError);
  }

  let queriedInvoices;
  if (user.role === "Admin") {
    queriedInvoices = await db.query.invoices.findMany({
      with: {
        items: true,
      },
    });
  } else {
    queriedInvoices = await db.query.invoices.findMany({
      where: eq(invoices.createdBy, user.id),
      with: {
        items: true,
      },
    });
  }

  // Save to Redis cache
  try {
    await redisClient.set(cacheKey, JSON.stringify(queriedInvoices), {
      EX: 3600, // 1 hour TTL
    });
  } catch (redisError) {
    console.error("Redis save error in getInvoices:", redisError);
  }

  res.status(200).json(queriedInvoices);
});

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceNumber, customerName, customerEmail, invoiceDate, dueDate, taxRate, subtotal, tax, total, status, items } = req.body;
  const user = req.user!;

  if (!invoiceNumber || !customerName || !customerEmail || !invoiceDate || !dueDate || subtotal === undefined || total === undefined) {
    throw AppError.badRequest('Required invoice fields are missing', 'MISSING_FIELDS');
  }

  const newInvoice = await db.transaction(async (tx) => {
    const [inv] = await tx.insert(invoices).values({
      invoiceNumber,
      customerName,
      customerEmail,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      taxRate,
      subtotal,
      tax,
      total,
      status: status || 'Draft',
      createdBy: user.id,
    }).returning();

    if (items && items.length > 0) {
      const itemsWithInvoiceId = items.map((item: any) => ({
        invoiceId: inv!.id,
        itemName: item.itemName,
        quantity: Number(item.quantity),
        price: Number(item.price),
        total: Number(item.quantity) * Number(item.price),
      }));
      await tx.insert(invoiceItems).values(itemsWithInvoiceId);
    }

    return await tx.query.invoices.findFirst({
      where: eq(invoices.id, inv!.id),
      with: {
        items: true,
      },
    });
  });

  // Invalidate Redis cache
  try {
    await redisClient.del("invoices:all:admin");
    await redisClient.del(`invoices:all:${user.id}`);
  } catch (redisError) {
    console.error("Redis clear error in createInvoice:", redisError);
  }

  res.status(201).json(newInvoice);
});

export const updateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { invoiceNumber, customerName, customerEmail, invoiceDate, dueDate, taxRate, subtotal, tax, total, status, items } = req.body;
  const user = req.user!;

  const [existing] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!existing) {
    throw AppError.notFound(`Invoice with ID ${id} not found`, 'INVOICE_NOT_FOUND');
  }

  // Verify ownership if not Admin
  if (user.role !== "Admin" && existing.createdBy !== user.id) {
    throw AppError.forbidden("Access forbidden: You do not have permissions to modify this invoice", "INSUFFICIENT_PERMISSIONS");
  }

  const updatedInvoice = await db.transaction(async (tx) => {
    await tx.update(invoices)
      .set({
        invoiceNumber,
        customerName,
        customerEmail,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        taxRate,
        subtotal,
        tax,
        total,
        status,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));

    if (items) {
      // Simple strategy: clear old items and insert updated ones
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      if (items.length > 0) {
        const itemsWithInvoiceId = items.map((item: any) => ({
          invoiceId: id,
          itemName: item.itemName,
          quantity: Number(item.quantity),
          price: Number(item.price),
          total: Number(item.quantity) * Number(item.price),
        }));
        await tx.insert(invoiceItems).values(itemsWithInvoiceId);
      }
    }

    return await tx.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        items: true,
      },
    });
  });

  // Invalidate Redis cache
  try {
    await redisClient.del("invoices:all:admin");
    await redisClient.del(`invoices:all:${user.id}`);
    if (existing.createdBy) {
      await redisClient.del(`invoices:all:${existing.createdBy}`);
    }
  } catch (redisError) {
    console.error("Redis clear error in updateInvoice:", redisError);
  }

  res.status(200).json(updatedInvoice);
});

export const deleteInvoice = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = req.user!;

  const [existing] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!existing) {
    throw AppError.notFound(`Invoice with ID ${id} not found`, 'INVOICE_NOT_FOUND');
  }

  // Deletes are Admin-only under standard routing, but verify ownership/role for extra layer of defense
  if (user.role !== "Admin" && existing.createdBy !== user.id) {
    throw AppError.forbidden("Access forbidden: You do not have permissions to delete this invoice", "INSUFFICIENT_PERMISSIONS");
  }

  await db.delete(invoices).where(eq(invoices.id, id)); // CASCADE handles deleting items!

  // Invalidate Redis cache
  try {
    await redisClient.del("invoices:all:admin");
    await redisClient.del(`invoices:all:${user.id}`);
    if (existing.createdBy) {
      await redisClient.del(`invoices:all:${existing.createdBy}`);
    }
  } catch (redisError) {
    console.error("Redis clear error in deleteInvoice:", redisError);
  }

  res.status(200).json({ message: 'Invoice deleted successfully' });
});

