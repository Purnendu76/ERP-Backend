import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { redisClient } from '../config/redis.js';

export const getProducts = async (req: Request, res: Response) => {
  try {
    // Attempt to get from Redis cache
    try {
      const cachedProducts = await redisClient.get("products:all");
      if (cachedProducts) {
        res.status(200).json(JSON.parse(cachedProducts));
        return;
      }
    } catch (redisError) {
      console.error("Redis error in getProducts:", redisError);
    }

    const allProducts = await db.select().from(products);

    // Save to Redis cache
    try {
      await redisClient.set("products:all", JSON.stringify(allProducts), {
        EX: 3600, // 1 hour TTL
      });
    } catch (redisError) {
      console.error("Redis save error in getProducts:", redisError);
    }

    res.status(200).json(allProducts);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, sku, category, price, stock, status, image } = req.body;
    const [newProduct] = await db.insert(products).values({
      name,
      sku,
      category,
      price,
      stock,
      status,
      image,
    }).returning();

    // Invalidate Redis cache
    try {
      await redisClient.del("products:all");
    } catch (redisError) {
      console.error("Redis clear error in createProduct:", redisError);
    }

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updates = req.body;
    const [updatedProduct] = await db.update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    // Invalidate Redis cache
    try {
      await redisClient.del("products:all");
    } catch (redisError) {
      console.error("Redis clear error in updateProduct:", redisError);
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.delete(products).where(eq(products.id, id));

    // Invalidate Redis cache
    try {
      await redisClient.del("products:all");
    } catch (redisError) {
      console.error("Redis clear error in deleteProduct:", redisError);
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};
