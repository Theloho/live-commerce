import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    environmentVariables: {
      NAVER_CLOUD_ACCESS_KEY_ID: process.env.NAVER_CLOUD_ACCESS_KEY_ID ?
        `설정됨 (${process.env.NAVER_CLOUD_ACCESS_KEY_ID.substring(0, 10)}...)` : '미설정',
      NAVER_CLOUD_SECRET_KEY: process.env.NAVER_CLOUD_SECRET_KEY ?
        `설정됨 (${process.env.NAVER_CLOUD_SECRET_KEY.substring(0, 10)}...)` : '미설정',
      NAVER_CLOUD_SENS_SERVICE_ID: process.env.NAVER_CLOUD_SENS_SERVICE_ID || '미설정'
    }
  })
}