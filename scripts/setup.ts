import { runMigrations } from '../server/database/migrations.ts';
import { seedDatabase } from '../server/database/seed.ts';
import { closeDb } from '../server/database/connection.ts';

console.log('[setup] Running database migrations...');
runMigrations();
console.log('[setup] Seeding initial store data...');
seedDatabase();
closeDb();
console.log('[setup] Database setup and seed complete.');
