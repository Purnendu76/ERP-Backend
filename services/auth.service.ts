import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class AuthService {
  static async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  static async createUser(userData: typeof users.$inferInsert) {
    const [newUser] = await db.insert(users).values(userData).returning();
    return newUser;
  }

  static async getAllUsers() {
    return await db.select().from(users);
  }
}
