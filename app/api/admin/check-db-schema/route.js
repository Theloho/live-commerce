import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    const results = {}

    // 1. Check if addresses table exists
    const { data: addressesTable, error: addressesTableError } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .limit(1)

    results.addressesTableExists = !addressesTableError
    results.addressesTableError = addressesTableError?.message

    // 2. Check profiles table structure
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(1)
      .single()

    results.profilesData = profiles
    results.profilesError = profilesError?.message
    results.profilesHasAddressesColumn = profiles ? ('addresses' in profiles) : false

    // 3. If addresses column exists, check its value
    if (profiles && 'addresses' in profiles) {
      results.addressesColumnType = typeof profiles.addresses
      results.addressesColumnValue = profiles.addresses
    }

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
