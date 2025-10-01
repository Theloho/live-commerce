# Live Commerce Project

> **🤖 CLAUDE CODE - 새 세션 시작 시 필수 읽기 문서 (반드시 순서대로 읽을 것!)**
>
> **1단계: 최신 시스템 상태 확인** ⭐
> - ✅ `SYSTEM_HEALTH_CHECK_2025-10-01.md` - **전체 시스템 점검 보고서 (95점)**
>   - DB 구조 현황 (17개 테이블)
>   - 발견된 문제점 및 해결 방안
>   - 페이지별 데이터 흐름 검증 완료
>   - 개선 권장사항
>
> **2단계: DB 작업 시 필수 참조** 🗄️
> - ✅ `DB_REFERENCE_GUIDE.md` - **모든 DB 작업 전 반드시 읽기**
>   - 전체 DB 스키마 (profiles, orders, order_items 등)
>   - 테이블별 상세 컬럼 설명
>   - 데이터 저장/조회 패턴
>   - 주의사항 및 함정 (중복 컬럼 등)
>   - 완전한 코드 예제
>   - 빠른 참조 체크리스트
>
> **3단계: 상세 데이터 흐름 이해**
> - ✅ `DETAILED_DATA_FLOW.md` - **실제 프로덕션 코드 기반** 페이지별 데이터 흐름
>   - 6개 주요 페이지 상세 분석
>   - API 엔드포인트별 처리 과정
>   - DB 테이블 정확한 컬럼 매핑
>   - 트러블슈팅 가이드
>
> **4단계: 시스템 아키텍처 확인**
> - `SYSTEM_ARCHITECTURE_PRODUCTION.md` - 실제 프로덕션 DB 스키마 기준
> - `DATA_ARCHITECTURE.md` - 전체 데이터 구조 개요
>
> **5단계: 개발 가이드라인**
> - `CLAUDE.md` - 체계적 개발 명령어 및 규칙
>   - `/system-check` - 문제 해결 전 필수
>   - `/fix-with-system` - 체계적 수정 프로세스
>   - `/update-docs` - 문서 최신화
>
> **6단계: 배포 및 시스템 관리 (나중에 필요 시)**
> - `DEPLOYMENT_STRATEGY.md` - 프로덕션 안전 배포 전략
>   - Vercel Preview Deployment 활용
>   - 환경변수 분리 전략
>   - DB Migration 시스템
>   - 배포 워크플로우
> - `SYSTEM_CLONE_GUIDE.md` - 시스템 복제 가이드
>   - 동일한 쇼핑몰 시스템 복제 방법
>   - 단계별 복제 프로세스 (1시간)
>   - 템플릿화 계획
>
> **중요 원칙:**
> - 모든 작업 전 위 문서들을 반드시 먼저 읽을 것
> - `/system-check` 명령어로 관련 시스템 확인 후 작업
> - `/fix-with-system`으로 체계적 수정
> - `/update-docs`로 문서 최신화
> - 임시방편 수정 금지, 항상 체계적 접근

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# 배포 트리거 Tue Sep 23 22:29:49 KST 2025
# 데이터 초기화 후 시스템 안정화 배포
