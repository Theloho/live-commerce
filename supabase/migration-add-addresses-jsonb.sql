-- Add addresses JSONB column to profiles table for multiple address management
-- This column will store an array of address objects in JSON format

-- Add the addresses column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb;

-- Add a comment to explain the column structure
COMMENT ON COLUMN profiles.addresses IS 'Array of address objects: [{id, label, address, detail_address, is_default, created_at}]';

-- Create an index on the addresses column for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_addresses ON profiles USING GIN (addresses);

-- Create a function to validate address object structure
CREATE OR REPLACE FUNCTION validate_address_object(address_obj jsonb)
RETURNS boolean AS $$
BEGIN
  RETURN (
    address_obj ? 'id' AND
    address_obj ? 'label' AND
    address_obj ? 'address' AND
    address_obj ? 'is_default' AND
    jsonb_typeof(address_obj->'id') = 'number' AND
    jsonb_typeof(address_obj->'label') = 'string' AND
    jsonb_typeof(address_obj->'address') = 'string' AND
    jsonb_typeof(address_obj->'is_default') = 'boolean'
  );
END;
$$ LANGUAGE plpgsql;

-- Create a check constraint to ensure addresses array contains valid objects
-- (This is optional and can be added later if needed)
-- ALTER TABLE profiles
-- ADD CONSTRAINT check_addresses_format
-- CHECK (
--   addresses IS NULL OR
--   jsonb_typeof(addresses) = 'array'
-- );