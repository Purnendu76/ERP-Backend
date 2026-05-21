import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const allLogs = await db.select().from(auditLogs);
    res.status(200).json(allLogs);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const createAuditLog = async (req: Request, res: Response) => {
  try {
    const { action, entity, userName, userEmail, ipAddress, details } = req.body;
    const [newLog] = await db.insert(auditLogs).values({
      action,
      entity,
      userName,
      userEmail,
      ipAddress,
      details,
    }).returning();

    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};

export const clearAuditLogs = async (req: Request, res: Response) => {
  try {
    await db.delete(auditLogs);
    res.status(200).json({ message: 'Audit logs cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
  }
};
