#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  console.log('Make sure .env.local has:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runSQL() {
  console.log('🔧 Live Commerce - Simple SQL Data Setup')
  console.log('=======================================\n')

  try {
    // Read the simple-seed.sql file
    const sqlPath = path.join(__dirname, 'supabase', 'simple-seed.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    console.log('📄 Executing simple-seed.sql...')
    console.log('⚠️  Note: This requires service role key or database admin access')
    console.log('   If this fails, please run the SQL manually in Supabase SQL Editor\n')

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    let successCount = 0
    let errorCount = 0

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          if (error) {
            console.log(`❌ SQL Error:`, error.message)
            errorCount++
          } else {
            successCount++
          }
        } catch (err) {
          console.log(`❌ Statement failed:`, err.message)
          errorCount++
        }
      }
    }

    console.log(`\n📊 Results: ${successCount} success, ${errorCount} errors`)

    if (errorCount > 0) {
      console.log('\n⚠️  Some SQL statements failed.')
      console.log('This is likely because:')
      console.log('1. You need service role key for admin operations')
      console.log('2. Some tables may not exist yet')
      console.log('3. Manual execution in Supabase SQL Editor may be required')
      console.log('\n📋 To run manually:')
      console.log(`1. Go to your Supabase project dashboard`)
      console.log(`2. Navigate to SQL Editor`)
      console.log(`3. Copy and paste the contents of: ${sqlPath}`)
      console.log(`4. Click "Run"`)
    }

  } catch (error) {
    console.error('❌ Failed to execute SQL:', error.message)

    // Show manual instructions
    const sqlPath = path.join(__dirname, 'supabase', 'simple-seed.sql')
    console.log('\n📋 Manual setup instructions:')
    console.log(`1. Go to your Supabase project dashboard`)
    console.log(`2. Navigate to SQL Editor`)
    console.log(`3. Copy and paste the contents of: ${sqlPath}`)
    console.log(`4. Click "Run"`)
    console.log('\n💡 This will create all test data including:')
    console.log('   - 10 product categories')
    console.log('   - 10 sample products')
    console.log('   - 3 broadcast sessions')
    console.log('   - Product-broadcast relationships')
  }
}

if (require.main === module) {
  runSQL()
}

module.exports = { runSQL }