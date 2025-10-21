# 🗄️ 레거시 파일 관리 (DEPRECATED FILES)

**버전**: 1.0
**작성일**: 2025-10-21
**목적**: 사용하지 않는 파일을 별도 관리하여 리팩토링 시 혼동 방지

---

## 📋 이동된 파일 목록

### 1. lib/supabaseApi.js.bak → deprecated/lib/supabaseApi.DEPRECATED.20251015.js

**이동 날짜**: 2025-10-21
**원본 크기**: 98KB
**이동 사유**: 2025-10-15 이전 백업 파일, 현재 사용하지 않음

**대체 파일**:
- 현재 사용: `lib/supabaseApi.js` (2,673 lines)
- 마이그레이션 대상: Phase 1에서 Repository로 분리 예정

**포함 함수**: 43개 (레거시 버전)

---

### 2. lib/supabaseApi.js.bak2 → deprecated/lib/supabaseApi.DEPRECATED.20251010.js

**이동 날짜**: 2025-10-21
**원본 크기**: 86KB
**이동 사유**: 2025-10-10 이전 백업 파일, 현재 사용하지 않음

**대체 파일**:
- 현재 사용: `lib/supabaseApi.js` (2,673 lines)
- 마이그레이션 대상: Phase 1에서 Repository로 분리 예정

**포함 함수**: 43개 (레거시 버전)

---

## 🔍 레거시 함수 목록 (삭제 예정)

**현재 lib/supabaseApi.js에 남아있지만 사용하지 않는 함수 11개**

### 1. getOrders (line 673)

**상태**: ❌ 사용 안 함
**대체**: `/api/orders/list` API Route (Service Role)
**삭제 예정**: Phase 0.6 (Step 0.6.4)
**사유**: 성능 문제 (13-15초) → API Route로 이동 완료

---

### 2. getAllOrders (line 774)

**상태**: ❌ 사용 안 함
**대체**: `/api/admin/orders` API Route (Service Role)
**삭제 예정**: Phase 0.6 (Step 0.6.4)
**사유**: 성능 문제 (products JOIN) → API Route로 이동 완료

---

### 3. getCurrentUser (line 1770)

**상태**: ❌ 사용 안 함
**대체**: `hooks/useAuth.js` (Zustand store)
**삭제 예정**: Phase 0.6 (Step 0.6.4)
**사유**: useAuth hook으로 통합됨

---

### 4. signIn (line 1813)

**상태**: ❌ 사용 안 함
**대체**: `hooks/useAuth.js` - `signInWithPassword()`
**삭제 예정**: Phase 0.6 (Step 0.6.4)
**사유**: useAuth hook으로 통합됨

---

### 5. signUp (line 1828)

**상태**: ❌ 사용 안 함
**대체**: `hooks/useAuth.js` - `signUp()`
**삭제 예정**: Phase 0.6 (Step 0.6.4)
**사유**: useAuth hook으로 통합됨

---

### 6. signOut (line 1867)

**상태**: ❌ 사용 안 함
**대체**: `hooks/useAuth.js` - `signOut()`
**삭제 예정**: Phase 0.6 (Step 0.6.4)
**사유**: useAuth hook으로 통합됨

---

### 7. generateGroupOrderNumber (line 1893)

**상태**: ⚠️ 문제 있음
**대체**: 삭제 예정 (S 통일)
**삭제 예정**: Phase 0.6 (Step 0.6.4)
**사유**: DB에는 S로 저장, UI에서 G로 표시 → 검색 불일치 (2025-10-15 이슈)

---

### 8. checkOptionInventory (line 330)

**상태**: ⚠️ 레거시
**대체**: `checkVariantInventory()` (line 2383)
**삭제 예정**: Phase 0.6 (Step 0.6.4)
**사유**: Variant 시스템으로 전환됨 (2025-10-01)

---

### 9. updateOptionInventory (line 533)

**상태**: ⚠️ 레거시
**대체**: `updateVariantInventory()` (line 2317)
**삭제 예정**: Phase 0.6 (Step 0.6.4)
**사유**: Variant 시스템으로 전환됨 (2025-10-01)

---

### 10. updateOptionInventoryRPC (line 454)

**상태**: ⚠️ 레거시
**대체**: `updateVariantInventory()` (line 2317)
**삭제 예정**: Phase 0.6 (Step 0.6.4)
**사유**: Variant 시스템으로 전환됨 (2025-10-01)

---

### 11. createOrderWithOptions (line 482)

**상태**: ❌ 사용 안 함
**대체**: `createOrder()` (line 637)
**삭제 예정**: Phase 0.6 (Step 0.6.4)
**사유**: createOrder가 Variant 지원하도록 개선됨

---

## 📝 레거시 파일 관리 규칙

### Rule 11: 레거시 파일 관리 (DEVELOPMENT_PRINCIPLES.md)

**❌ 절대 금지**:
- 사용하지 않는 파일을 app/ 또는 lib/에 방치
- .bak, .backup, .old 파일을 프로젝트 루트에 보관
- 레거시 함수를 남겨두고 새 함수와 공존

**✅ 반드시**:
- /deprecated/ 폴더로 이동
- 파일명에 날짜 추가 (예: supabaseApi.DEPRECATED.20251021.js)
- DEPRECATED_FILES.md에 이동 이유와 날짜 기록
- 대체 파일 경로 명확히 안내
- 레거시 함수에 @deprecated JSDoc 태그 추가

---

## 🔄 복원 방법 (긴급 시)

만약 레거시 파일이 필요한 경우:

```bash
# 1. deprecated 폴더에서 복사
cp deprecated/lib/supabaseApi.DEPRECATED.20251015.js lib/supabaseApi.js.restored

# 2. 필요한 부분만 추출
# (수동으로 코드 비교 후 필요한 함수만 복사)

# 3. 원본은 그대로 유지
# deprecated/ 폴더의 파일은 절대 삭제하지 말 것
```

---

## 📊 통계

| 항목 | 개수 |
|------|------|
| **이동된 파일** | 2개 |
| **레거시 함수 (삭제 예정)** | 11개 |
| **대체된 함수** | 6개 (useAuth로) |
| **Variant로 전환된 함수** | 3개 |
| **API Route로 이동된 함수** | 2개 |

---

## 🎯 다음 단계

**Step 0.6.4**: 레거시 함수 11개에 `@deprecated` JSDoc 태그 추가
- lib/supabaseApi.js 해당 함수에 태그 추가
- 대체 함수 경로 명시
- ESLint 경고 활성화

**Phase 1**: Repository 생성 후 레거시 함수 완전 삭제

---

**최종 업데이트**: 2025-10-21
**다음 리뷰**: Phase 1 시작 전
