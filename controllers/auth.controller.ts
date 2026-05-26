import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt.js';
import { redisClient } from '../config/redis.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const registerUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, status, photo } = req.body;

  if (!email || !password || !name) {
    throw AppError.badRequest('Name, email, and password are required', 'MISSING_FIELDS');
  }

  // Check if user already exists
  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    throw AppError.badRequest('User with this email already exists', 'EMAIL_ALREADY_EXISTS');
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const [newUser] = await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
    role: role || 'Staff',
    status: status || 'Active',
    photo,
  }).returning();

  if (!newUser) {
    throw AppError.internal('Failed to register user', 'REGISTRATION_FAILED');
  }

  // Remove password from returned user object
  const { password: _, ...userWithoutPassword } = newUser;

  // Send welcome email via Notification Server in the background
  const notificationServerUrl = process.env.NOTIFICATION_SERVER_URL || "http://localhost:5001";
  const notificationApiKey = process.env.NOTIFICATION_API_KEY || "erp-demo-secret-key";

  fetch(`${notificationServerUrl}/api/notifications/new-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": notificationApiKey,
    },
    body: JSON.stringify({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      temporaryPassword: password, // Send the plain password supplied by admin
    }),
  })
    .then((response) => {
      if (!response.ok) {
        console.error("Notification server returned non-OK status:", response.status);
      } else {
        console.log("Welcome email notification triggered successfully! 📩");
      }
    })
    .catch((err) => {
      console.error("Failed to trigger welcome email on notification server:", err);
    });

  res.status(201).json({ message: 'User registered successfully', user: userWithoutPassword });
});

export const loginUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw AppError.badRequest('Email and password are required', 'MISSING_FIELDS');
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Generate JWT token
  const token = await generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const { password: _, ...userWithoutPassword } = user;

  res.status(200).json({
    message: 'Login successful',
    token,
    user: userWithoutPassword,
  });
});

export const getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const allUsers = await db.select().from(users);
  
  // Remove password from all user objects
  const sanitizedUsers = allUsers.map(({ password: _, ...userWithoutPassword }) => userWithoutPassword);

  res.status(200).json(sanitizedUsers);
});

export const updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { name, email, password, role, status, photo } = req.body;

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (status !== undefined) updates.status = status;
  if (photo !== undefined) updates.photo = photo;

  if (password) {
    const salt = await bcrypt.genSalt(10);
    updates.password = await bcrypt.hash(password, salt);
  }

  updates.updatedAt = new Date();

  const [updatedUser] = await db.update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning();

  if (!updatedUser) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }

  const { password: _, ...userWithoutPassword } = updatedUser;
  res.status(200).json(userWithoutPassword);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  
  const [existing] = await db.select().from(users).where(eq(users.id, id));
  if (!existing) {
    throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  }

  await db.delete(users).where(eq(users.id, id));
  res.status(200).json({ message: 'User deleted successfully' });
});

export const logoutUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw AppError.badRequest('Access token required', 'TOKEN_REQUIRED');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw AppError.badRequest('Invalid token format', 'INVALID_TOKEN_FORMAT');
  }

  // Set token to blacklist in Redis for 2 hours (matching standard JWT expiry)
  try {
    await redisClient.set(`blacklist:${token}`, "true", {
      EX: 2 * 60 * 60, // 2 hours TTL in seconds
    });
  } catch (redisError) {
    console.error("Redis blacklist save error during logout:", redisError);
  }

  res.status(200).json({ message: 'Logged out successfully' });
});


