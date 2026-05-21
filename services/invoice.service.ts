import { db } from '../db/index.js';
import { invoices, invoiceItems } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class InvoiceService {
  static async listInvoices() {
    return await db.query.invoices.findMany({
      with: {
        items: true,
      },
    });
  }

  static async createInvoice(invoiceData: typeof invoices.$inferInsert, items: Array<Partial<typeof invoiceItems.$inferInsert>>) {
    return await db.transaction(async (tx) => {
      const [inv] = await tx.insert(invoices).values(invoiceData).returning();

      if (items && items.length > 0) {
        const itemsWithInvoiceId = items.map((item) => ({
          invoiceId: inv!.id,
          itemName: item.itemName!,
          quantity: item.quantity!,
          price: item.price!,
          total: item.quantity! * item.price!,
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
  }

  static async deleteInvoice(id: string) {
    await db.delete(invoices).where(eq(invoices.id, id));
    return true;
  }
}
