# 🗄️ 데이터베이스 설정 가이드

새로운 Supabase 프로젝트에 우리 소스 코드에 맞는 데이터베이스를 설정하는 방법입니다.

## 📋 단계별 설정

### 1. Supabase 대시보드 접속
- URL: https://app.supabase.com/project/xoinislnaxllijlnjeue
- SQL Editor로 이동: https://app.supabase.com/project/xoinislnaxllijlnjeue/sql/new

### 2. SQL 스키마 실행
- 프로젝트 루트의 `supabase_schema.sql` 파일 내용을 복사
- Supabase SQL Editor에 붙여넣기
- 전체 SQL을 한 번에 실행

### 3. 생성되는 테이블 목록

#### 📊 핵심 테이블
- **profiles** - 사용자 프로필 정보
- **products** - 상품 정보
- **product_options** - 상품 옵션
- **orders** - 주문 정보
- **order_items** - 주문 상품
- **order_shipping** - 배송 정보
- **order_payments** - 결제 정보

#### 📺 라이브 커머스
- **live_broadcasts** - 라이브 방송
- **live_products** - 라이브 상품 연결

#### 🛒 쇼핑 기능
- **cart_items** - 장바구니
- **wishlist** - 찜하기
- **reviews** - 리뷰/평점

#### 🎟️ 마케팅
- **coupons** - 쿠폰
- **user_coupons** - 사용자별 쿠폰

#### 🔔 알림
- **notifications** - 알림

### 4. 보안 설정 (RLS)
모든 테이블에 Row Level Security(RLS)가 자동으로 설정됩니다:
- 사용자는 자신의 데이터만 접근 가능
- 상품은 모든 사용자가 조회 가능
- 관리자만 상품 등록/수정 가능

### 5. 샘플 데이터
다음 샘플 데이터가 자동으로 생성됩니다:
- 5개 상품 (한우, 흑돼지, 연어, 채소, 과일)
- 2개 라이브 방송

### 6. 관리자 계정 설정
환경변수에서 지정된 관리자 계정:
- 이메일: `master@allok.world`
- 비밀번호: `yi01buddy!!`

관리자로 회원가입 후 profiles 테이블에서 `is_admin = true`로 수동 설정

## ⚙️ 환경변수 확인

`.env.local` 파일이 새로운 Supabase 프로젝트로 업데이트되었는지 확인:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xoinislnaxllijlnjeue.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 Vercel 환경변수 업데이트

Vercel 대시보드에서도 다음 환경변수를 업데이트해야 합니다:
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## ✅ 설정 완료 확인

1. **Table Editor에서 테이블 생성 확인**
2. **Authentication 탭에서 새 사용자 가입 테스트**
3. **API 탭에서 테이블 조회 테스트**
4. **앱에서 상품 목록 정상 로드 확인**

---

❗ **중요**: SQL 실행 후 모든 테이블이 정상 생성되었는지 반드시 확인하세요.
문제가 있으면 SQL Editor의 에러 메시지를 확인하고 수정하세요.