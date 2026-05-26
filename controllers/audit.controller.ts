import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const allLogs = await db.select().from(auditLogs);
  res.status(200).json(allLogs);
});

export const createAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const { action, entity, userName, userEmail, ipAddress, details } = req.body;
  
  if (!action || !entity) {
    throw AppError.badRequest("Action and entity are required fields", "MISSING_REQUIRED_FIELDS");
  }

  const [newLog] = await db.insert(auditLogs).values({
    action,
    entity,
    userName,
    userEmail,
    ipAddress,
    details,
  }).returning();

  res.status(201).json(newLog);
});

export const clearAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  await db.delete(auditLogs);
  res.status(200).json({ message: 'Audit logs cleared successfully' });
});

