import { db } from '../db/index.js';
import { products } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class ProductService {
  static async listProducts() {
    return await db.select().from(products);
  }

  static async createProduct(productData: typeof products.$inferInsert) {
    const [newProduct] = await db.insert(products).values(productData).returning();
    return newProduct;
  }

  static async updateProduct(id: string, updates: Partial<typeof products.$inferInsert>) {
    const [updatedProduct] = await db.update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  static async deleteProduct(id: string) {
    await db.delete(products).where(eq(products.id, id));
    return true;
  }
}
