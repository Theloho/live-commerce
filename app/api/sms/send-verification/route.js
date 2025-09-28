import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({ error: '휴대폰 번호는 필수입니다' }, { status: 400 })
    }

    // 휴대폰 번호 형식 검증
    const phoneRegex = /^010-?\d{4}-?\d{4}$/
    if (!phoneRegex.test(phoneNumber.replace(/[^0-9]/g, ''))) {
      return NextResponse.json({ error: '올바른 휴대폰 번호 형식이 아닙니다' }, { status: 400 })
    }

    // 정규화된 휴대폰 번호 (하이픈 제거)
    const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '')

    // 6자리 인증번호 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // 네이버 클라우드 플랫폼 SENS 설정
    const accessKeyId = process.env.NAVER_CLOUD_ACCESS_KEY_ID
    const secretKey = process.env.NAVER_CLOUD_SECRET_KEY
    const serviceId = process.env.NAVER_CLOUD_SENS_SERVICE_ID

    console.log('환경변수 확인:', {
      accessKeyId: accessKeyId ? '✅ 설정됨' : '❌ 미설정',
      secretKey: secretKey ? '✅ 설정됨' : '❌ 미설정',
      serviceId: serviceId ? '✅ 설정됨' : '❌ 미설정'
    })

    if (!accessKeyId || !secretKey || !serviceId) {
      console.error('환경변수 누락:', { accessKeyId: !!accessKeyId, secretKey: !!secretKey, serviceId: !!serviceId })
      return NextResponse.json({
        error: 'SENS 서비스 설정이 필요합니다',
        message: '환경변수를 확인해주세요',
        details: {
          accessKeyId: !!accessKeyId,
          secretKey: !!secretKey,
          serviceId: !!serviceId
        }
      }, { status: 500 })
    }

    // API 요청을 위한 서명 생성
    const timestamp = Date.now().toString()
    const method = 'POST'
    const url = `/sms/v2/services/${serviceId}/messages`
    const requestBody = {
      type: 'SMS',
      contentType: 'COMM',
      countryCode: '82',
      from: '01012345678', // 기본 발신번호 (나중에 등록된 번호로 변경)
      content: `[알록쇼핑몰] 인증번호는 ${verificationCode}입니다.`,
      messages: [
        {
          to: normalizedPhone
        }
      ]
    }

    // HMAC-SHA256 서명 생성
    const signatureString = `${method} ${url}\n${timestamp}\n${accessKeyId}`
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(signatureString)
      .digest('base64')

    // 네이버 클라우드 SENS API 호출
    const response = await fetch(`https://ncloud.apigw.ntruss.com/sms/v2/services/${serviceId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': accessKeyId,
        'x-ncp-apigw-signature-v2': signature,
      },
      body: JSON.stringify(requestBody),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('SENS API 오류:', {
        status: response.status,
        statusText: response.statusText,
        result: result
      })
      return NextResponse.json({
        error: 'SMS 발송에 실패했습니다',
        details: {
          status: response.status,
          statusText: response.statusText,
          result: result
        }
      }, { status: 500 })
    }

    // 인증번호를 임시로 메모리에 저장 (실제로는 Redis나 DB 사용 권장)
    // 나중에 Supabase에 저장하도록 개선할 예정
    global.verificationCodes = global.verificationCodes || {}
    global.verificationCodes[normalizedPhone] = {
      code: verificationCode,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5분 후 만료
      attempts: 0
    }

    return NextResponse.json({
      success: true,
      message: 'SMS 발송 성공',
      requestId: result.requestId
    })

  } catch (error) {
    console.error('SMS 발송 오류:', error)
    return NextResponse.json({
      error: 'SMS 발송 중 오류가 발생했습니다',
      message: error.message
    }, { status: 500 })
  }
}