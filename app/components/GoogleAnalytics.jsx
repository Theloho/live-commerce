'use client'

import Script from 'next/script'

/**
 * 구글 애널리틱스 (GA4) 컴포넌트
 *
 * 사용법:
 * 1. GA4 계정에서 측정 ID 생성 (G-XXXXXXXXXX)
 * 2. Vercel 환경변수 추가: NEXT_PUBLIC_GA_MEASUREMENT_ID
 * 3. Layout에서 이 컴포넌트 추가
 *
 * 주의:
 * - 환경변수가 없으면 아무것도 렌더링하지 않음 (개발 환경 대비)
 * - strategy="afterInteractive"로 페이지 로딩 속도 영향 최소화
 */
export default function GoogleAnalytics() {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  // 환경변수가 없으면 렌더링하지 않음
  if (!GA_MEASUREMENT_ID) {
    return null
  }

  return (
    <>
      {/* GA4 스크립트 로드 */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />

      {/* GA4 초기화 및 설정 */}
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            // 기본 페이지뷰 추적
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}
