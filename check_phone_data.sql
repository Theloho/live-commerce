-- 카카오 사용자 중 휴대폰 번호 있는지 확인
SELECT 
  provider,
  COUNT(*) as total_users,
  COUNT(phone) as users_with_phone,
  COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as users_with_valid_phone
FROM profiles
WHERE provider = 'kakao'
GROUP BY provider;

-- 샘플 데이터 확인 (개인정보 마스킹)
SELECT 
  id,
  provider,
  kakao_id,
  CASE 
    WHEN phone IS NOT NULL THEN '010-****-****' 
    ELSE 'NULL'
  END as phone_masked,
  created_at
FROM profiles
WHERE provider = 'kakao'
LIMIT 5;
