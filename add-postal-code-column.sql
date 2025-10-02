-- profiles 테이블에 postal_code 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- 기존 데이터 확인
SELECT COUNT(*) as total_profiles, 
       COUNT(postal_code) as profiles_with_postal_code 
FROM profiles;
