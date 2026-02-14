import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Pool } = pg;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DATABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing required environment variables for admin initialization.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function prompt(msg) {
  console.log(`[Admin Init] ${msg}`);
}

async function main() {
  try {
    prompt(`Checking for user: ${ADMIN_EMAIL}`);

    // 1. Create or Get User in Supabase Auth
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let userId = null;
    const existingUser = listData.users.find((u) => u.email === ADMIN_EMAIL);

    if (existingUser) {
      prompt('User already exists in Supabase.');
      userId = existingUser.id;
    } else {
      prompt('Creating new user in Supabase...');
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });

      if (createError) throw createError;
      userId = createData.user.id;
      prompt(`User created with ID: ${userId}`);
    }

    // 2. Ensure User is in 'profiles' table (App DB)
    // The trigger on auth.users usually handles this if they are in the same DB.
    // But here they are separate. We must ensure the profile exists.
    // However, 00_create_profiles.sql creates the table. The app usage usually expects a profile.
    // We will manually insert into profiles if not exists to be safe.
    
    prompt('Verifying profile in database...');
    // We create a minimal profile.
    const profileQuery = `
      INSERT INTO profiles (id, marketing_opt_in)
      VALUES ($1, false)
      ON CONFLICT (id) DO NOTHING;
    `;
    await pool.query(profileQuery, [userId]);
    prompt('Profile verified.');

    // 3. Assign Admin Role
    prompt('Assigning admin role...');
    // Try inserting into user_roles first (preferred method)
    // We need to check if user_roles table exists as it comes from 05_create_jobs_tables.sql
    
    // Check if user_roles table exists
    const checkTableRes = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles'
      );
    `);
    
    const hasUserRoles = checkTableRes.rows[0].exists;

    if (hasUserRoles) {
      await pool.query(`
        INSERT INTO user_roles (user_id, role)
        VALUES ($1, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
      `, [userId]);
      prompt('Admin role assigned in user_roles.');
    } else {
      // Fallback to app_admins if user_roles doesn't exist (legacy)
      await pool.query(`
        INSERT INTO app_admins (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING;
      `, [userId]);
      prompt('Admin role assigned in app_admins.');
    }

    prompt('Admin initialization completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Admin Init] Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
