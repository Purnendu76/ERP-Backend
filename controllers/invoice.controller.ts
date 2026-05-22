import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { invoices, invoiceItems } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { redisClient } from '../config/redis.js';

export const getInvoices = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { invoiceNumber, customerName, customerEmail, invoiceDate, dueDate, taxRate, subtotal, tax, total, status, items } = req.body;

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
        status,
      }).returning();

      if (items && items.length > 0) {
        const itemsWithInvoiceId = items.map((item: any) => ({
          invoiceId: inv!.id,
          itemName: item.itemName,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
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
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { invoiceNumber, customerName, customerEmail, invoiceDate, dueDate, taxRate, subtotal, tax, total, status, items } = req.body;

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
        .where(eq(invoices.id, id!));

      if (items) {
        // Simple strategy: clear old items and insert updated ones
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id!));
        if (items.length > 0) {
          const itemsWithInvoiceId = items.map((item: any) => ({
            invoiceId: id,
            itemName: item.itemName,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
          }));
          await tx.insert(invoiceItems).values(itemsWithInvoiceId);
        }
      }

      return await tx.query.invoices.findFirst({
        where: eq(invoices.id, id!),
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
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.delete(invoices).where(eq(invoices.id, id)); // CASCADE handles deleting items!

    // Invalidate Redis cache
    try {
      await redisClient.del("invoices:all");
    } catch (redisError) {
      console.error("Redis clear error in deleteInvoice:", redisError);
    }

    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};
