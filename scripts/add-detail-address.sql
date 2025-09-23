-- profiles 테이블에 detail_address 컬럼 추가
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS detail_address TEXT DEFAULT '';

-- 기존 데이터에 대해 빈 문자열로 초기화
UPDATE profiles
SET detail_address = ''
WHERE detail_address IS NULL;