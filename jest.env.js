/**
 * Jest Environment Variables (Phase 7)
 * - .env.local 환경변수 로드
 * - Supabase 연결 정보 필요
 */

const dotenv = require('dotenv')
const path = require('path')

// .env.local 로드
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

// 필수 환경변수 검증
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️ Warning: ${envVar} is not set in .env.local`)
  }
}
