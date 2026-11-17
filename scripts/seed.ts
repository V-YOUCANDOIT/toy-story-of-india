import { seedDatabase } from '../server/database/seed.ts';
import { closeDb } from '../server/database/connection.ts';

console.log('[seed] Seeding database...');
seedDatabase();
closeDb();
console.log('[seed] Done.');
