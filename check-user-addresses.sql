-- 김진태(기무친) 사용자의 저장된 주소 확인
SELECT
  p.name,
  p.nickname,
  p.addresses
FROM profiles p
WHERE p.name = '김진태' OR p.nickname = '기무친';
