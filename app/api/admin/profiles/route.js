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
      const now = new Date()
      const startDateTime = new Date(now.setHours(0, 0, 0, 0)).toISOString()
      query = query.gte('created_at', startDateTime)
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
