#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' })

// Run the test data setup
const { main } = require('./app/setup/test-data.js')

console.log('🔧 Live Commerce - Test Data Setup')
console.log('=====================================\n')

main().catch(error => {
  console.error('💥 Setup failed:', error)
  process.exit(1)
})