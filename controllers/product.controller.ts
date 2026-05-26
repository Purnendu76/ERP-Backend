import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { redisClient } from '../config/redis.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
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
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const { name, sku, category, price, stock, status, image } = req.body;
  
  if (!name || !sku || !category || price === undefined) {
    throw AppError.badRequest("Name, SKU, category, and price are required fields", "MISSING_REQUIRED_FIELDS");
  }

  const [newProduct] = await db.insert(products).values({
    name,
    sku,
    category,
    price: Number(price),
    stock: stock ? Number(stock) : 0,
    status: status || 'In Stock',
    image,
  }).returning();

  // Invalidate Redis cache
  try {
    await redisClient.del("products:all");
  } catch (redisError) {
    console.error("Redis clear error in createProduct:", redisError);
  }

  res.status(201).json(newProduct);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updates = req.body;

  const [existing] = await db.select().from(products).where(eq(products.id, id));
  if (!existing) {
    throw AppError.notFound(`Product with ID ${id} not found`, "PRODUCT_NOT_FOUND");
  }

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
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const [existing] = await db.select().from(products).where(eq(products.id, id));
  if (!existing) {
    throw AppError.notFound(`Product with ID ${id} not found`, "PRODUCT_NOT_FOUND");
  }

  await db.delete(products).where(eq(products.id, id));

  // Invalidate Redis cache
  try {
    await redisClient.del("products:all");
  } catch (redisError) {
    console.error("Redis clear error in deleteProduct:", redisError);
  }

  res.status(200).json({ message: 'Product deleted successfully' });
});

