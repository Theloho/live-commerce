-- Add address and social media fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS detail_address TEXT,
ADD COLUMN IF NOT EXISTS tiktok_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS youtube_id VARCHAR(100);