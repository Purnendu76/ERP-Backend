import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { invoices, invoiceItems } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { redisClient } from '../config/redis.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  // Attempt to get from Redis cache
  try {
    const cachedInvoices = await redisClient.get("invoices:all");
    if (cachedInvoices) {
      res.status(200).json(JSON.parse(cachedInvoices));
      return;
    }
  } catch (redisError) {
    console.error("Redis error in getInvoices:", redisError);
  }

  const allInvoices = await db.query.invoices.findMany({
    with: {
      items: true,
    },
  });

  // Save to Redis cache
  try {
    await redisClient.set("invoices:all", JSON.stringify(allInvoices), {
      EX: 3600, // 1 hour TTL
    });
  } catch (redisError) {
    console.error("Redis save error in getInvoices:", redisError);
  }

  res.status(200).json(allInvoices);
});

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceNumber, customerName, customerEmail, invoiceDate, dueDate, taxRate, subtotal, tax, total, status, items } = req.body;

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
    await redisClient.del("invoices:all");
  } catch (redisError) {
    console.error("Redis clear error in createInvoice:", redisError);
  }

  res.status(201).json(newInvoice);
});

export const updateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { invoiceNumber, customerName, customerEmail, invoiceDate, dueDate, taxRate, subtotal, tax, total, status, items } = req.body;

  const [existing] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!existing) {
    throw AppError.notFound(`Invoice with ID ${id} not found`, 'INVOICE_NOT_FOUND');
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
    await redisClient.del("invoices:all");
  } catch (redisError) {
    console.error("Redis clear error in updateInvoice:", redisError);
  }

  res.status(200).json(updatedInvoice);
});

export const deleteInvoice = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const [existing] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!existing) {
    throw AppError.notFound(`Invoice with ID ${id} not found`, 'INVOICE_NOT_FOUND');
  }

  await db.delete(invoices).where(eq(invoices.id, id)); // CASCADE handles deleting items!

  // Invalidate Redis cache
  try {
    await redisClient.del("invoices:all");
  } catch (redisError) {
    console.error("Redis clear error in deleteInvoice:", redisError);
  }

  res.status(200).json({ message: 'Invoice deleted successfully' });
});

