/**
 * CheckoutLoadingState - 체크아웃 로딩 상태 컴포넌트
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

export default function CheckoutLoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-gray-800 font-medium text-lg mb-2">결제 준비 중</p>
        <p className="text-gray-500 text-sm">잠시만 기다려주세요...</p>

        {/* 진행 단계 표시 */}
        <div className="mt-6 max-w-xs mx-auto">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>인증확인</span>
            <span>주문정보</span>
            <span>사용자정보</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
