/**
 * 인증 Setup 테스트
 *
 * 이 테스트는 한 번만 실행되며, 로그인 상태를 저장합니다.
 * 이후 모든 테스트는 저장된 상태를 재사용합니다.
 *
 * 실행 방법:
 * 1. npm run test:setup (headed 모드로 실행)
 * 2. 브라우저가 열리면 카카오 로그인 버튼 클릭
 * 3. 이미 카카오에 로그인되어 있으면 자동으로 승인
 * 4. allok.shop으로 리다이렉트되면 완료
 * 5. playwright/.auth/user.json에 상태 저장됨
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');

setup.setTimeout(180000); // 3분 타임아웃

setup('카카오 로그인 및 상태 저장', async ({ page }) => {
  console.log('🔑 카카오 로그인 시작...');

  // 1. 로그인 페이지 이동
  await page.goto('https://allok.shop/login');

  // 2. 카카오 로그인 버튼 클릭
  const kakaoButton = page.locator('button:has-text("카카오"), a:has-text("카카오")');
  await expect(kakaoButton).toBeVisible({ timeout: 10000 });
  await kakaoButton.click();

  console.log('⏳ 카카오 로그인 페이지 대기 중...');
  await page.waitForURL(/accounts\.kakao\.com/, { timeout: 10000 });

  // 3. 카카오 로그인 자동 입력
  console.log('📝 카카오 계정 자동 로그인 중...');

  // 이메일 입력
  const emailInput = page.locator('input[name="loginId"], input[type="email"]');
  await emailInput.waitFor({ timeout: 5000 });
  await emailInput.fill('jay.machine@gmail.com');

  // 비밀번호 입력
  const passwordInput = page.locator('input[name="password"], input[type="password"]');
  await passwordInput.fill('jtdani0214!');

  // 로그인 버튼 클릭
  const loginButton = page.locator('button[type="submit"], button.submit');
  await loginButton.click();

  // 4. 로그인 완료 대기 (홈페이지 또는 프로필 완성 페이지로 리다이렉트)
  console.log('⏳ 로그인 완료 대기 중...');
  await page.waitForURL(/https:\/\/allok\.shop(\/|\/complete-profile)?/, {
    timeout: 60000
  });

  console.log('✅ 로그인 완료!');

  // 4. 프로필 완성 페이지라면 건너뛰기 (이미 프로필 있으면 자동 넘어감)
  const currentUrl = page.url();
  if (currentUrl.includes('/complete-profile')) {
    console.log('📝 프로필 완성 페이지 감지...');

    // 필수 필드 확인 및 입력
    const nameInput = page.locator('input[name="name"]');
    const phoneInput = page.locator('input[name="phone"]');

    if (await nameInput.count() > 0) {
      const nameValue = await nameInput.inputValue();
      if (!nameValue) {
        console.log('   이름을 입력하세요');
        await page.waitForTimeout(5000); // 사용자 입력 대기
      }
    }

    if (await phoneInput.count() > 0) {
      const phoneValue = await phoneInput.inputValue();
      if (!phoneValue) {
        console.log('   전화번호를 입력하세요');
        await page.waitForTimeout(5000);
      }
    }

    // 완료 버튼 클릭
    const submitButton = page.locator('button:has-text("완료"), button[type="submit"]');
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForURL('https://allok.shop/', { timeout: 10000 });
    }
  }

  // 5. 홈페이지에서 Supabase 세션 생성 대기
  await page.goto('https://allok.shop/');
  await page.waitForTimeout(5000); // 세션 생성 대기

  // localStorage에서 Supabase 세션 확인
  const authState = await page.evaluate(() => {
    const supabaseKey = Object.keys(localStorage).find(key => key.includes('sb-') && key.includes('-auth-token'));
    if (supabaseKey) {
      return JSON.parse(localStorage.getItem(supabaseKey) || '{}');
    }
    return null;
  });

  console.log('🔍 Supabase 세션:', authState ? '✅ 존재' : '❌ 없음');

  if (!authState || !authState.access_token) {
    // 재시도: 한 번 더 대기
    await page.waitForTimeout(5000);
    const retryAuthState = await page.evaluate(() => {
      const supabaseKey = Object.keys(localStorage).find(key => key.includes('sb-') && key.includes('-auth-token'));
      if (supabaseKey) {
        return JSON.parse(localStorage.getItem(supabaseKey) || '{}');
      }
      return null;
    });

    if (!retryAuthState || !retryAuthState.access_token) {
      console.error('❌ Supabase 세션 생성 실패');
      throw new Error('Supabase 세션을 찾을 수 없습니다');
    }
  }

  console.log('✅ Supabase 세션 확인 완료');

  // 6. 로그인 상태 저장
  await page.context().storageState({ path: authFile });
  console.log(`💾 로그인 상태 저장: ${authFile}`);
  console.log('');
  console.log('이제 다른 테스트들은 이 상태를 재사용합니다.');
  console.log('토큰 만료 시 이 setup을 다시 실행하세요: npm run test:setup');
});
