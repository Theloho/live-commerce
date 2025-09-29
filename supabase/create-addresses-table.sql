-- Create addresses table for storing multiple shipping addresses per user
-- 사용자별 다중 배송지 주소 저장을 위한 addresses 테이블 생성

-- Drop table if exists (주의: 기존 데이터가 삭제됩니다)
-- DROP TABLE IF EXISTS addresses;

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL DEFAULT '배송지',
  address TEXT NOT NULL,
  detail_address TEXT DEFAULT '',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(user_id, is_default);

-- Add comments
COMMENT ON TABLE addresses IS '사용자별 배송지 주소 관리 테이블';
COMMENT ON COLUMN addresses.user_id IS '사용자 ID (auth.users 참조)';
COMMENT ON COLUMN addresses.label IS '배송지 라벨 (예: 집, 회사 등)';
COMMENT ON COLUMN addresses.address IS '기본 주소';
COMMENT ON COLUMN addresses.detail_address IS '상세 주소';
COMMENT ON COLUMN addresses.is_default IS '기본 배송지 여부';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_addresses_updated_at
BEFORE UPDATE ON addresses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- 사용자는 자신의 주소만 볼 수 있음
CREATE POLICY "Users can view own addresses" ON addresses
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 주소만 추가할 수 있음
CREATE POLICY "Users can insert own addresses" ON addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 주소만 수정할 수 있음
CREATE POLICY "Users can update own addresses" ON addresses
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 주소만 삭제할 수 있음
CREATE POLICY "Users can delete own addresses" ON addresses
  FOR DELETE USING (auth.uid() = user_id);

-- Service role은 모든 작업 가능 (API 라우트용)
CREATE POLICY "Service role can do everything" ON addresses
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');