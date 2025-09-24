import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('📺 방송 목록 조회')

    // 임시로 Mock 데이터 반환 (추후 DB 테이블 연결)
    const mockBroadcasts = [
      {
        id: 1,
        title: "🔥 신상품 라이브 쇼핑 🔥",
        description: "새로 출시된 무선 이어폰과 스마트 워치를 특가로 만나보세요!",
        status: "live",
        scheduled_at: new Date().toISOString(),
        started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        viewer_count: 1247,
        products: [
          { id: 1, title: "프리미엄 무선 이어폰", price: 89000 },
          { id: 2, title: "스마트 워치 시리즈 X", price: 299000 }
        ],
        thumbnail_url: "https://picsum.photos/400/300?random=1"
      },
      {
        id: 2,
        title: "주말 특가 방송",
        description: "주말 한정 특가 상품들을 소개합니다",
        status: "scheduled",
        scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        started_at: null,
        viewer_count: 0,
        products: [
          { id: 3, title: "울트라 슬림 노트북", price: 1290000 },
          { id: 4, title: "블루투스 스피커", price: 79000 }
        ],
        thumbnail_url: "https://picsum.photos/400/300?random=2"
      }
    ]

    return NextResponse.json({
      success: true,
      broadcasts: mockBroadcasts
    })

  } catch (error) {
    console.error('방송 목록 조회 실패:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        broadcasts: []
      },
      { status: 500 }
    )
  }
}