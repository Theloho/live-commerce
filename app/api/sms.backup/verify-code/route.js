import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { phoneNumber, verificationCode } = await request.json()

    if (!phoneNumber || !verificationCode) {
      return NextResponse.json({
        error: '휴대폰 번호와 인증번호는 필수입니다'
      }, { status: 400 })
    }

    // 정규화된 휴대폰 번호
    const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '')

    // 저장된 인증번호 확인
    const storedData = global.verificationCodes?.[normalizedPhone]

    if (!storedData) {
      return NextResponse.json({
        error: '인증번호가 존재하지 않습니다. 다시 요청해주세요.'
      }, { status: 400 })
    }

    // 만료 시간 확인
    if (Date.now() > storedData.expiresAt) {
      delete global.verificationCodes[normalizedPhone]
      return NextResponse.json({
        error: '인증번호가 만료되었습니다. 다시 요청해주세요.'
      }, { status: 400 })
    }

    // 시도 횟수 확인 (최대 5회)
    if (storedData.attempts >= 5) {
      delete global.verificationCodes[normalizedPhone]
      return NextResponse.json({
        error: '인증 시도 횟수를 초과했습니다. 다시 요청해주세요.'
      }, { status: 400 })
    }

    // 인증번호 확인
    if (storedData.code !== verificationCode) {
      storedData.attempts++
      return NextResponse.json({
        error: '인증번호가 일치하지 않습니다.',
        remainingAttempts: 5 - storedData.attempts
      }, { status: 400 })
    }

    // 인증 성공 - 저장된 데이터 삭제
    delete global.verificationCodes[normalizedPhone]

    return NextResponse.json({
      success: true,
      message: '휴대폰 인증이 완료되었습니다.',
      verifiedPhone: normalizedPhone
    })

  } catch (error) {
    console.error('SMS 인증 확인 오류:', error)
    return NextResponse.json({
      error: '인증 확인 중 오류가 발생했습니다',
      message: error.message
    }, { status: 500 })
  }
}