import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdminAuth } from '@/lib/supabaseAdmin'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminEmail = searchParams.get('adminEmail')
    const dateRange = searchParams.get('dateRange') || 'today'

    // 관리자 인증 확인
    if (!adminEmail) {
      return NextResponse.json(
        { error: '관리자 인증 정보가 필요합니다' },
        { status: 401 }
      )
    }

    const isAdmin = await verifyAdminAuth(adminEmail)
    if (!isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 날짜 필터 설정
    let query = supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true })

    if (dateRange === 'today') {
      // 서울 시간 기준: 오늘 00:00 ~ 23:59:59
      const now = new Date()
      const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
      koreaTime.setHours(0, 0, 0, 0)

      const endTime = new Date(koreaTime)
      endTime.setHours(23, 59, 59, 999)

      query = query.gte('created_at', koreaTime.toISOString())
      query = query.lte('created_at', endTime.toISOString())
    }

    const { count, error } = await query

    if (error) {
      console.error('프로필 조회 에러:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: count || 0
    })
  } catch (error) {
    console.error('프로필 API 에러:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
