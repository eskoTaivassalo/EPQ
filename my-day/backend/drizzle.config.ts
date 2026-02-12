import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    wranglerConfigPath: './wrangler.toml',
    dbName: 'myDay',
  },
} satisfies Config;
