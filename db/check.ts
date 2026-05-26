import { db } from './index.js';
import { users } from './schema.js';

const check = async () => {
  try {
    const list = await db.select().from(users);
    console.log("Current Users in Database:");
    console.log(JSON.stringify(list, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
check();

