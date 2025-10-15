-- 송장번호 운송업체 정보 추가 마이그레이션
-- order_shipping 테이블에 tracking_company 컬럼 추가

ALTER TABLE order_shipping
ADD COLUMN IF NOT EXISTS tracking_company VARCHAR(50) DEFAULT 'hanjin';

-- 기존 데이터 기본값 설정 (한진택배)
UPDATE order_shipping
SET tracking_company = 'hanjin'
WHERE tracking_number IS NOT NULL
  AND tracking_company IS NULL;

-- 코멘트 추가
COMMENT ON COLUMN order_shipping.tracking_company IS '택배사 코드 (기본: hanjin)';
