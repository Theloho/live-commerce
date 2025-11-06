-- Add kakao_link column to profiles table
-- Migration: 2025-11-06 - Add kakao_link for customer management

-- Check if column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'kakao_link'
    ) THEN
        ALTER TABLE profiles ADD COLUMN kakao_link TEXT;
        RAISE NOTICE 'Column kakao_link added to profiles table';
    ELSE
        RAISE NOTICE 'Column kakao_link already exists in profiles table';
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN profiles.kakao_link IS '관리자가 저장하는 카카오톡 1:1 채팅 링크';
