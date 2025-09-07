#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(filename) {
  try {
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', filename)
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log(`Running migration: ${filename}`)
    const { error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      console.error(`Error running ${filename}:`, error)
      return false
    }
    
    console.log(`✅ ${filename} completed successfully`)
    return true
  } catch (err) {
    console.error(`Error reading ${filename}:`, err)
    return false
  }
}

async function main() {
  console.log('🚀 Running database migrations...')
  
  const migrations = [
    '20241221_fix_rls_policies.sql',
    '20241221_add_updated_at_to_invitations.sql'
  ]
  
  for (const migration of migrations) {
    const success = await runMigration(migration)
    if (!success) {
      console.error(`❌ Migration ${migration} failed`)
      process.exit(1)
    }
  }
  
  console.log('🎉 All migrations completed successfully!')
}

main().catch(console.error)
