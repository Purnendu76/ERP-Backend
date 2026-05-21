import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';

export class AuditService {
  static async listLogs() {
    return await db.select().from(auditLogs);
  }

  static async logActivity(logData: typeof auditLogs.$inferInsert) {
    const [newLog] = await db.insert(auditLogs).values(logData).returning();
    return newLog;
  }

  static async clearAllLogs() {
    await db.delete(auditLogs);
    return true;
  }
}
