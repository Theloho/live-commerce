import Link from 'next/link'

export const metadata = {
  title: '개인정보 처리방침 - 알록',
  description: '알록의 개인정보 처리방침 및 쿠키 사용 안내',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg p-8">
          <h1 className="text-3xl font-bold mb-8">개인정보 처리방침</h1>

          <div className="space-y-8 text-gray-700">
            {/* 1. 수집하는 개인정보 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. 수집하는 개인정보 항목</h2>
              <p className="mb-4">
                알록은 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>필수항목: 이름, 연락처, 배송주소, 이메일</li>
                <li>선택항목: 카카오 계정 정보 (카카오 로그인 시)</li>
                <li>자동수집: 접속 로그, 쿠키, IP주소, 서비스 이용 기록</li>
              </ul>
            </section>

            {/* 2. 개인정보의 수집 및 이용 목적 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">2. 개인정보의 수집 및 이용 목적</h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>회원 가입 및 관리, 본인 확인</li>
                <li>상품 주문 및 배송</li>
                <li>고객 문의 응대 및 고지사항 전달</li>
                <li>서비스 개선 및 마케팅 활용</li>
                <li>부정 이용 방지 및 비인가 사용 방지</li>
              </ul>
            </section>

            {/* 3. 개인정보의 보유 및 이용 기간 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">3. 개인정보의 보유 및 이용 기간</h2>
              <p className="mb-4">
                이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체 없이 파기합니다.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>회원 탈퇴 시: 즉시 삭제 (법령에서 정한 경우 제외)</li>
                <li>주문/배송 정보: 전자상거래법에 따라 5년간 보관</li>
                <li>쿠키: 브라우저 종료 시 또는 로그아웃 시 삭제</li>
              </ul>
            </section>

            {/* 4. 쿠키 사용 안내 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">4. 쿠키(Cookie) 사용 안내</h2>
              <p className="mb-4">
                알록은 웹사이트 기능 개선과 사용자 경험 향상을 위해 쿠키를 사용합니다.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">쿠키란?</h3>
              <p className="mb-4">
                쿠키는 웹사이트가 사용자의 브라우저에 저장하는 작은 텍스트 파일로,
                사용자의 방문 기록이나 설정을 기억하는 데 사용됩니다.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">쿠키 사용 목적</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>로그인 상태 유지</li>
                <li>장바구니 정보 저장</li>
                <li>사용자 맞춤 콘텐츠 제공</li>
                <li>웹사이트 트래픽 분석 (Google Analytics)</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">쿠키 거부 방법</h3>
              <p className="mb-4">
                사용자는 쿠키 설정을 통해 쿠키 저장을 거부할 수 있습니다.
                단, 쿠키 저장을 거부할 경우 일부 서비스 이용에 제한이 있을 수 있습니다.
              </p>
            </section>

            {/* 5. Google Analytics 사용 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Google Analytics 사용</h2>
              <p className="mb-4">
                알록은 웹사이트 이용 패턴 분석 및 서비스 개선을 위해 Google Analytics를 사용합니다.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>수집 정보: 페이지뷰, 방문 시간, 디바이스 정보, 브라우저 정보</li>
                <li>개인 식별 정보는 수집하지 않습니다</li>
                <li>수집된 정보는 통계 목적으로만 사용됩니다</li>
                <li>
                  Google Analytics 개인정보 보호정책:{' '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    https://policies.google.com/privacy
                  </a>
                </li>
              </ul>
            </section>

            {/* 6. 개인정보 보호책임자 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">6. 개인정보 보호책임자</h2>
              <p className="mb-4">
                알록은 개인정보 처리에 관한 업무를 총괄해서 책임지고,
                개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여
                아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>개인정보 보호책임자</strong></p>
                <p>이메일: privacy@allok.world</p>
              </div>
            </section>

            {/* 7. 개인정보 처리방침 변경 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">7. 개인정보 처리방침 변경</h2>
              <p>
                이 개인정보 처리방침은 법령, 정책 또는 보안기술의 변경에 따라
                내용이 추가, 삭제 및 수정될 수 있으며, 개정 시 웹사이트를 통해 공지합니다.
              </p>
              <p className="mt-4">
                <strong>시행일자: 2025년 10월 17일</strong>
              </p>
            </section>
          </div>

          {/* 하단 버튼 */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
