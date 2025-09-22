# Live Commerce Setup Guide

## Database Setup

Since the automated test data setup requires Supabase Auth integration, here are the manual setup steps:

### Option 1: Manual SQL Setup (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/simple-seed.sql`
4. Click **"Run"**

This will create:
- ✅ 5 main categories + 5 subcategories
- ✅ 10 sample products
- ✅ 3 broadcast sessions (1 live, 2 scheduled)
- ✅ Broadcast-product relationships
- ✅ Demo seller profile

### Option 2: Component-by-Component Setup

If the full SQL fails, you can run individual parts:

1. **Categories first** (copy from `simple-seed.sql` lines 66-79)
2. **Demo seller** (lines 85-86)
3. **Products** (lines 92-176)
4. **Broadcasts** (lines 182-205)
5. **Relationships** (lines 211-225)

### Option 3: Automated Setup (If you have service role key)

```bash
# Add your service role key to .env.local
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Then run
npm run setup-simple
```

## Verification

After setup, you can verify the data by checking your Supabase dashboard:

- **Categories**: Should see 10 categories (5 main + 5 sub)
- **Products**: Should see 10 products with Korean names
- **Broadcasts**: Should see 3 broadcasts (1 live, 2 scheduled)
- **Profiles**: Should see 1 demo seller profile

## Development

Once data is set up:

```bash
npm run dev
```

Visit `http://localhost:3000` to see your live commerce app with test data.

## Troubleshooting

**Foreign Key Errors**: This means the profiles table requires Supabase Auth. Use the manual SQL approach above.

**Permission Errors**: You need service role key for automated setup, or use manual SQL editor approach.

**UUID Errors**: The simple-seed.sql uses `gen_random_uuid()` which works in Supabase SQL editor.