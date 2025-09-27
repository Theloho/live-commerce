// 입력 검증 유틸리티 모듈
// 휴대폰 번호, 이름, 주소, 닉네임 등의 유효성 검사

/**
 * 휴대폰 번호 검증
 * @param {string} phone - 검증할 휴대폰 번호
 * @returns {object} { isValid: boolean, error: string, sanitized: string }
 */
export const validatePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      error: '휴대폰 번호를 입력해주세요',
      sanitized: ''
    }
  }

  // 숫자만 추출
  const digits = phone.replace(/[^\d]/g, '')

  // 길이 검증 (11자리)
  if (digits.length !== 11) {
    return {
      isValid: false,
      error: '휴대폰 번호는 11자리여야 합니다 (예: 010-1234-5678)',
      sanitized: digits
    }
  }

  // 010으로 시작하는지 검증
  if (!digits.startsWith('010')) {
    return {
      isValid: false,
      error: '휴대폰 번호는 010으로 시작해야 합니다',
      sanitized: digits
    }
  }

  // 정규식 검증 (010-XXXX-XXXX 형태)
  const phoneRegex = /^010\d{8}$/
  if (!phoneRegex.test(digits)) {
    return {
      isValid: false,
      error: '올바른 휴대폰 번호 형식이 아닙니다',
      sanitized: digits
    }
  }

  // 포맷팅된 번호 생성
  const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`

  return {
    isValid: true,
    error: null,
    sanitized: digits,
    formatted: formatted
  }
}

/**
 * 이름 검증
 * @param {string} name - 검증할 이름
 * @returns {object} { isValid: boolean, error: string, sanitized: string }
 */
export const validateName = (name) => {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      error: '이름을 입력해주세요',
      sanitized: ''
    }
  }

  const trimmed = name.trim()

  // 빈 문자열 검증
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: '이름을 입력해주세요',
      sanitized: trimmed
    }
  }

  // 길이 검증 (2-20자)
  if (trimmed.length < 2 || trimmed.length > 20) {
    return {
      isValid: false,
      error: '이름은 2자 이상 20자 이하여야 합니다',
      sanitized: trimmed
    }
  }

  // 한글, 영문만 허용 (숫자, 특수문자 제외)
  const nameRegex = /^[가-힣a-zA-Z\s]+$/
  if (!nameRegex.test(trimmed)) {
    return {
      isValid: false,
      error: '이름은 한글 또는 영문만 입력 가능합니다',
      sanitized: trimmed
    }
  }

  // 연속된 공백 제거
  const sanitized = trimmed.replace(/\s+/g, ' ')

  return {
    isValid: true,
    error: null,
    sanitized: sanitized
  }
}

/**
 * 닉네임 검증
 * @param {string} nickname - 검증할 닉네임
 * @returns {object} { isValid: boolean, error: string, sanitized: string }
 */
export const validateNickname = (nickname) => {
  if (!nickname || typeof nickname !== 'string') {
    return {
      isValid: false,
      error: '닉네임을 입력해주세요',
      sanitized: ''
    }
  }

  const trimmed = nickname.trim()

  // 빈 문자열 검증
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: '닉네임을 입력해주세요',
      sanitized: trimmed
    }
  }

  // 길이 검증 (2-15자)
  if (trimmed.length < 2 || trimmed.length > 15) {
    return {
      isValid: false,
      error: '닉네임은 2자 이상 15자 이하여야 합니다',
      sanitized: trimmed
    }
  }

  // 한글, 영문, 숫자만 허용 (특수문자 제외)
  const nicknameRegex = /^[가-힣a-zA-Z0-9]+$/
  if (!nicknameRegex.test(trimmed)) {
    return {
      isValid: false,
      error: '닉네임은 한글, 영문, 숫자만 입력 가능합니다',
      sanitized: trimmed
    }
  }

  // 금지어 검사 (기본적인 욕설, 부적절한 단어)
  const forbiddenWords = ['admin', 'administrator', '관리자', 'allok', '운영자', 'test', 'null', 'undefined']
  const lowerNickname = trimmed.toLowerCase()

  for (const word of forbiddenWords) {
    if (lowerNickname.includes(word.toLowerCase())) {
      return {
        isValid: false,
        error: '사용할 수 없는 닉네임입니다',
        sanitized: trimmed
      }
    }
  }

  return {
    isValid: true,
    error: null,
    sanitized: trimmed
  }
}

/**
 * 주소 검증
 * @param {string} address - 검증할 주소
 * @returns {object} { isValid: boolean, error: string, sanitized: string }
 */
export const validateAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return {
      isValid: false,
      error: '주소를 입력해주세요',
      sanitized: ''
    }
  }

  const trimmed = address.trim()

  // 빈 문자열 검증
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: '주소를 입력해주세요',
      sanitized: trimmed
    }
  }

  // 길이 검증 (5-100자)
  if (trimmed.length < 5 || trimmed.length > 100) {
    return {
      isValid: false,
      error: '주소는 5자 이상 100자 이하여야 합니다',
      sanitized: trimmed
    }
  }

  // 기본적인 주소 형식 검증 (시/도, 구/군 포함)
  const addressKeywords = ['시', '구', '군', '동', '로', '길', '아파트', '빌딩']
  const hasValidKeyword = addressKeywords.some(keyword => trimmed.includes(keyword))

  if (!hasValidKeyword) {
    return {
      isValid: false,
      error: '올바른 주소 형식이 아닙니다 (예: 서울시 강남구 테헤란로 123)',
      sanitized: trimmed
    }
  }

  // 연속된 공백 제거
  const sanitized = trimmed.replace(/\s+/g, ' ')

  return {
    isValid: true,
    error: null,
    sanitized: sanitized
  }
}

/**
 * 상세주소 검증 (선택적)
 * @param {string} detailAddress - 검증할 상세주소
 * @returns {object} { isValid: boolean, error: string, sanitized: string }
 */
export const validateDetailAddress = (detailAddress) => {
  // 상세주소는 선택사항이므로 빈 값도 허용
  if (!detailAddress || typeof detailAddress !== 'string') {
    return {
      isValid: true,
      error: null,
      sanitized: ''
    }
  }

  const trimmed = detailAddress.trim()

  // 빈 문자열은 허용
  if (trimmed.length === 0) {
    return {
      isValid: true,
      error: null,
      sanitized: ''
    }
  }

  // 길이 검증 (1-50자)
  if (trimmed.length > 50) {
    return {
      isValid: false,
      error: '상세주소는 50자 이하여야 합니다',
      sanitized: trimmed
    }
  }

  // 기본적인 특수문자 제한 (일부 허용)
  const detailAddressRegex = /^[가-힣a-zA-Z0-9\s\-\(\)]+$/
  if (!detailAddressRegex.test(trimmed)) {
    return {
      isValid: false,
      error: '상세주소에 허용되지 않는 문자가 포함되어 있습니다',
      sanitized: trimmed
    }
  }

  // 연속된 공백 제거
  const sanitized = trimmed.replace(/\s+/g, ' ')

  return {
    isValid: true,
    error: null,
    sanitized: sanitized
  }
}

/**
 * 패스워드 검증
 * @param {string} password - 검증할 패스워드
 * @returns {object} { isValid: boolean, error: string, strength: string }
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: '비밀번호를 입력해주세요',
      strength: 'none'
    }
  }

  // 길이 검증 (최소 6자, 권장 8자 이상)
  if (password.length < 6) {
    return {
      isValid: false,
      error: '비밀번호는 최소 6자 이상이어야 합니다',
      strength: 'weak'
    }
  }

  if (password.length > 50) {
    return {
      isValid: false,
      error: '비밀번호는 50자 이하여야 합니다',
      strength: 'none'
    }
  }

  // 보안 강도 계산
  let strength = 'weak'
  let score = 0

  if (password.length >= 8) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  if (score >= 4) strength = 'strong'
  else if (score >= 2) strength = 'medium'

  // 간단한 패턴 검증 (연속된 숫자, 반복 문자 등)
  const weakPatterns = [
    /^(.)\1{5,}$/, // 같은 문자 반복
    /^123456/, // 연속된 숫자
    /^password/i, // 흔한 패스워드
    /^qwerty/i // 키보드 배열
  ]

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      return {
        isValid: false,
        error: '너무 간단한 패스워드입니다. 더 복잡한 패스워드를 사용해주세요',
        strength: 'weak'
      }
    }
  }

  return {
    isValid: true,
    error: null,
    strength: strength
  }
}

/**
 * 전체 회원가입 폼 검증
 * @param {object} formData - 폼 데이터
 * @returns {object} { isValid: boolean, errors: object, sanitizedData: object }
 */
export const validateSignupForm = (formData) => {
  const errors = {}
  const sanitizedData = {}

  // 이름 검증
  const nameResult = validateName(formData.name)
  if (!nameResult.isValid) {
    errors.name = nameResult.error
  }
  sanitizedData.name = nameResult.sanitized

  // 휴대폰 번호 검증
  const phoneResult = validatePhoneNumber(formData.phone)
  if (!phoneResult.isValid) {
    errors.phone = phoneResult.error
  }
  sanitizedData.phone = phoneResult.sanitized
  sanitizedData.phoneFormatted = phoneResult.formatted

  // 닉네임 검증
  const nicknameResult = validateNickname(formData.nickname || formData.name)
  if (!nicknameResult.isValid) {
    errors.nickname = nicknameResult.error
  }
  sanitizedData.nickname = nicknameResult.sanitized

  // 주소 검증
  const addressResult = validateAddress(formData.address)
  if (!addressResult.isValid) {
    errors.address = addressResult.error
  }
  sanitizedData.address = addressResult.sanitized

  // 상세주소 검증 (선택적)
  const detailAddressResult = validateDetailAddress(formData.detail_address)
  if (!detailAddressResult.isValid) {
    errors.detail_address = detailAddressResult.error
  }
  sanitizedData.detail_address = detailAddressResult.sanitized

  // 패스워드 검증
  const passwordResult = validatePassword(formData.password)
  if (!passwordResult.isValid) {
    errors.password = passwordResult.error
  }
  sanitizedData.passwordStrength = passwordResult.strength

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData
  }
}

export default {
  validatePhoneNumber,
  validateName,
  validateNickname,
  validateAddress,
  validateDetailAddress,
  validatePassword,
  validateSignupForm
}