import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { redisClient } from '../config/redis.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const cacheKey = user.role === "Admin" ? "products:all:admin" : `products:all:${user.id}`;

  // Attempt to get from Redis cache
  try {
    const cachedProducts = await redisClient.get(cacheKey);
    if (cachedProducts) {
      res.status(200).json(JSON.parse(cachedProducts));
      return;
    }
  } catch (redisError) {
    console.error("Redis error in getProducts:", redisError);
  }

  let queriedProducts;
  if (user.role === "Admin") {
    queriedProducts = await db.select().from(products);
  } else {
    queriedProducts = await db.select().from(products).where(eq(products.createdBy, user.id));
  }

  // Save to Redis cache
  try {
    await redisClient.set(cacheKey, JSON.stringify(queriedProducts), {
      EX: 3600, // 1 hour TTL
    });
  } catch (redisError) {
    console.error("Redis save error in getProducts:", redisError);
  }

  res.status(200).json(queriedProducts);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const { name, sku, category, price, stock, status, image } = req.body;
  const user = req.user!;
  
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
    createdBy: user.id,
  }).returning();

  // Invalidate Redis cache
  try {
    await redisClient.del("products:all:admin");
    await redisClient.del(`products:all:${user.id}`);
  } catch (redisError) {
    console.error("Redis clear error in createProduct:", redisError);
  }

  res.status(201).json(newProduct);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updates = req.body;
  const user = req.user!;

  const [existing] = await db.select().from(products).where(eq(products.id, id));
  if (!existing) {
    throw AppError.notFound(`Product with ID ${id} not found`, "PRODUCT_NOT_FOUND");
  }

  // Verify ownership if not Admin
  if (user.role !== "Admin" && existing.createdBy !== user.id) {
    throw AppError.forbidden("Access forbidden: You do not have permissions to modify this product", "INSUFFICIENT_PERMISSIONS");
  }

  const [updatedProduct] = await db.update(products)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  // Invalidate Redis cache
  try {
    await redisClient.del("products:all:admin");
    await redisClient.del(`products:all:${user.id}`);
    if (existing.createdBy) {
      await redisClient.del(`products:all:${existing.createdBy}`);
    }
  } catch (redisError) {
    console.error("Redis clear error in updateProduct:", redisError);
  }

  res.status(200).json(updatedProduct);
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = req.user!;

  const [existing] = await db.select().from(products).where(eq(products.id, id));
  if (!existing) {
    throw AppError.notFound(`Product with ID ${id} not found`, "PRODUCT_NOT_FOUND");
  }

  // Deletes are Admin-only under standard routing, but verify ownership/role for extra layer of defense
  if (user.role !== "Admin" && existing.createdBy !== user.id) {
    throw AppError.forbidden("Access forbidden: You do not have permissions to delete this product", "INSUFFICIENT_PERMISSIONS");
  }

  await db.delete(products).where(eq(products.id, id));

  // Invalidate Redis cache
  try {
    await redisClient.del("products:all:admin");
    await redisClient.del(`products:all:${user.id}`);
    if (existing.createdBy) {
      await redisClient.del(`products:all:${existing.createdBy}`);
    }
  } catch (redisError) {
    console.error("Redis clear error in deleteProduct:", redisError);
  }

  res.status(200).json({ message: 'Product deleted successfully' });
});

