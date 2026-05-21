import { db } from './index.js';
import { users } from './schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const seed = async () => {
  console.log('Seeding database with default admin user...');
  try {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';

    // Check if admin already exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingAdmin) {
      console.log(`Admin user with email '${adminEmail}' already exists. Skipping...`);
      process.exit(0);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Insert the admin user
    await db.insert(users).values({
      name: 'System Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'Admin',
      status: 'Active',
    });

    console.log('Successfully seeded Admin user!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seed();
