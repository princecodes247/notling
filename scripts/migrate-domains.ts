import { config } from 'dotenv';
config({ path: ['.env.local', '.env'] });

import pg from 'pg';

async function migrate() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log('Connected to database.');

  try {
    console.log('Adding public_home_doc_id to workspaces table...');
    await client.query(`
      ALTER TABLE workspaces 
      ADD COLUMN IF NOT EXISTS public_home_doc_id uuid;
      ALTER TABLE workspaces 
      DROP COLUMN IF EXISTS subdomain;
    `);

    console.log('Creating workspace_custom_domains table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_custom_domains (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        domain text NOT NULL UNIQUE,
        status text NOT NULL DEFAULT 'pending',
        dns_target text NOT NULL DEFAULT 'cname.notling.app',
        dns_record_type text NOT NULL DEFAULT 'CNAME',
        verified_at timestamp,
        last_checked_at timestamp,
        error_message text,
        public_home_doc_id uuid,
        is_primary boolean NOT NULL DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS workspace_custom_domains_ws_idx ON workspace_custom_domains(workspace_id);
      CREATE INDEX IF NOT EXISTS workspace_custom_domains_domain_idx ON workspace_custom_domains(domain);
    `);

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

migrate();
