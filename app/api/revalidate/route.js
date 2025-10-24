import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

/**
 * ISR 캐시 즉시 재생성 API
 *
 * 사용법:
 * GET /api/revalidate?path=/
 *
 * 또는 브라우저에서:
 * https://allok.shop/api/revalidate?path=/
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path') || '/'

    console.log(`🔄 [Revalidate API] 캐시 재생성 시작: ${path}`)

    // ISR 캐시 즉시 무효화
    revalidatePath(path)

    console.log(`✅ [Revalidate API] 캐시 재생성 완료: ${path}`)

    return NextResponse.json({
      success: true,
      message: `캐시가 재생성되었습니다: ${path}`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ [Revalidate API] 에러:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
