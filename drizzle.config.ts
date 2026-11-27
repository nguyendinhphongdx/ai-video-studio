// drizzle-kit: `npm run db:generate` writes a new migration into drizzle/ after a change to src/server/schema.ts.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL || 'postgres://avs:avs@127.0.0.1:5433/avs' },
});
