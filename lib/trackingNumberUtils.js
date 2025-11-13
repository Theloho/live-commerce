/**
 * 송장번호 관리 유틸리티
 *
 * ✅ 완전히 독립적인 함수 모듈
 * ✅ 어떤 페이지에서든 import하여 사용 가능
 * ✅ 테스트 가능한 순수 함수
 *
 * 사용 예시:
 * import { updateTrackingNumber, bulkUpdateTrackingNumbers, parseTrackingExcel } from '@/lib/trackingNumberUtils'
 */

/**
 * 단일 송장번호 업데이트
 *
 * @param {Object} params
 * @param {string} params.adminEmail - 관리자 이메일
 * @param {string} params.orderId - 주문 ID (UUID)
 * @param {string} params.trackingNumber - 송장번호
 * @param {string} [params.trackingCompany] - 택배사 코드 (기본: hanjin)
 * @returns {Promise<Object>} 업데이트 결과
 *
 * @example
 * const result = await updateTrackingNumber({
 *   adminEmail: 'admin@example.com',
 *   orderId: 'uuid-123',
 *   trackingNumber: '1234567890123',
 *   trackingCompany: 'hanjin'
 * })
 */
export async function updateTrackingNumber({
  adminEmail,
  orderId,
  trackingNumber,
  trackingCompany = 'hanjin'
}) {
  if (!adminEmail || !orderId || !trackingNumber) {
    throw new Error('필수 정보가 누락되었습니다 (adminEmail, orderId, trackingNumber)')
  }

  const response = await fetch('/api/admin/shipping/update-tracking', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      adminEmail,
      orderId,
      trackingNumber,
      trackingCompany
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '송장번호 업데이트에 실패했습니다')
  }

  return await response.json()
}

/**
 * 대량 송장번호 업데이트
 *
 * @param {Object} params
 * @param {string} params.adminEmail - 관리자 이메일
 * @param {Array<Object>} params.trackingData - 송장번호 데이터 배열
 * @param {string} params.trackingData[].customerOrderNumber - 주문번호
 * @param {string} params.trackingData[].trackingNumber - 송장번호
 * @param {string} [params.trackingData[].trackingCompany] - 택배사
 * @returns {Promise<Object>} 업데이트 결과 (matched, failed, results)
 *
 * @example
 * const result = await bulkUpdateTrackingNumbers({
 *   adminEmail: 'admin@example.com',
 *   trackingData: [
 *     {
 *       customerOrderNumber: 'G251015-1234',
 *       trackingNumber: '1234567890123',
 *       trackingCompany: 'CJ대한통운'
 *     },
 *     ...
 *   ]
 * })
 * console.log(`${result.matched}개 성공, ${result.failed}개 실패`)
 */
export async function bulkUpdateTrackingNumbers({
  adminEmail,
  trackingData
}) {
  if (!adminEmail) {
    throw new Error('adminEmail이 필요합니다')
  }

  if (!trackingData || !Array.isArray(trackingData) || trackingData.length === 0) {
    throw new Error('trackingData 배열이 필요합니다')
  }

  const response = await fetch('/api/admin/shipping/bulk-tracking', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      adminEmail,
      trackingData
    })
  })

  if (!response.ok) {
    // 504 Gateway Timeout 등 HTML 응답 처리
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json()
      throw new Error(error.error || '대량 업데이트에 실패했습니다')
    } else {
      // HTML 응답 (504 등)
      const text = await response.text()
      if (response.status === 504) {
        throw new Error(
          `서버 타임아웃 (504)\n\n` +
          `처리 시간이 초과되었습니다. 네트워크 상태를 확인하거나\n` +
          `500개 이하로 나눠서 다시 시도해주세요.`
        )
      }
      throw new Error(`서버 오류 (${response.status}): ${text.substring(0, 100)}`)
    }
  }

  return await response.json()
}

/**
 * Excel 파일에서 송장번호 데이터 파싱
 *
 * 지원 형식:
 * - .xlsx (Excel)
 * - .xls (Excel 구버전)
 * - .csv
 *
 * 필수 컬럼:
 * - 주문번호 (또는 orderNumber)
 * - 송장번호 (또는 trackingNumber)
 *
 * 선택 컬럼:
 * - 택배사 (또는 carrier, trackingCompany)
 *
 * @param {File} file - 업로드된 Excel/CSV 파일
 * @returns {Promise<Array<Object>>} 파싱된 송장번호 데이터
 *
 * @example
 * const fileInput = document.getElementById('file')
 * const file = fileInput.files[0]
 * const trackingData = await parseTrackingExcel(file)
 * console.log(`${trackingData.length}개 주문 인식됨`)
 */
export async function parseTrackingExcel(file) {
  if (!file) {
    throw new Error('파일이 선택되지 않았습니다')
  }

  // 파일 확장자 확인
  const fileName = file.name.toLowerCase()
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
  const isCsv = fileName.endsWith('.csv')

  if (!isExcel && !isCsv) {
    throw new Error('Excel (.xlsx, .xls) 또는 CSV 파일만 지원합니다')
  }

  // CSV 파싱
  if (isCsv) {
    return await parseCSV(file)
  }

  // Excel 파싱
  return await parseExcel(file)
}

/**
 * CSV 파일 파싱 (내부 함수)
 */
async function parseCSV(file) {
  const Papa = (await import('papaparse')).default

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // 디버깅: 실제 컬럼명 확인
          const columns = results.meta?.fields || Object.keys(results.data[0] || {})
          console.log('📋 CSV 파일 컬럼:', columns)

          const trackingData = results.data.map(row => {
            // 주문번호 찾기 (다양한 변형 지원)
            let orderNumber = row['주문번호'] || row['orderNumber'] || row['주문 번호'] ||
                               row['Order Number'] || row['ORDER NUMBER'] ||
                               row['고객주문번호'] || row['customer_order_number']

            // ⭐ 숫자로 저장된 경우 문자열로 변환
            if (orderNumber) {
              orderNumber = String(orderNumber).trim()
            }

            // 송장번호 찾기 (다양한 변형 지원)
            let tracking = row['송장번호'] || row['trackingNumber'] || row['송장 번호'] ||
                            row['Tracking Number'] || row['TRACKING NUMBER'] ||
                            row['운송장번호'] || row['운송장 번호'] || row['tracking_number']

            // ⭐ 숫자로 저장된 송장번호를 문자열로 변환
            if (tracking) {
              tracking = String(tracking).trim()
            }

            // 택배사 찾기 (다양한 변형 지원, 기본값: hanjin)
            const company = row['택배사'] || row['carrier'] || row['trackingCompany'] ||
                           row['운송사'] || row['Carrier'] || row['택배회사'] ||
                           row['배송사'] || row['tracking_company'] || 'hanjin'

            return {
              customerOrderNumber: orderNumber,
              trackingNumber: tracking,
              trackingCompany: company
            }
          })

          // 필수 필드 검증
          const validData = trackingData.filter(item =>
            item.customerOrderNumber && item.trackingNumber
          )

          if (validData.length === 0) {
            reject(new Error(
              `유효한 데이터가 없습니다.\n\n` +
              `파일 컬럼: ${columns.join(', ')}\n\n` +
              `필수 컬럼: '주문번호', '송장번호'\n` +
              `(또는 'orderNumber', 'trackingNumber')`
            ))
            return
          }

          console.log(`✅ CSV 파싱 성공: ${validData.length}개 주문`)
          resolve(validData)
        } catch (error) {
          reject(new Error(`CSV 파싱 오류: ${error.message}`))
        }
      },
      error: (error) => {
        reject(new Error(`CSV 읽기 오류: ${error.message}`))
      }
    })
  })
}

/**
 * Excel 파일 파싱 (내부 함수)
 * ⭐ 새로운 형식:
 * - 1행 제외 (헤더)
 * - B열: 운송장번호 (송장번호)
 * - K열: 품목명 (주문번호, 쉼표로 구분 가능)
 * - 택배사: 기본값 hanjin (한진택배)
 */
async function parseExcel(file) {
  const XLSX = await import('xlsx')

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })

        // 첫 번째 시트 읽기
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // ⭐ 1행 제외하고 읽기 (header: false로 읽어서 컬럼 인덱스로 접근)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        console.log('📋 Excel 파일 구조:', {
          totalRows: jsonData.length,
          headerRow: jsonData[0],
          firstDataRow: jsonData[1]
        })

        if (jsonData.length <= 1) {
          reject(new Error('Excel 파일에 데이터가 없습니다 (헤더만 존재)'))
          return
        }

        // ⭐ 1행(헤더) 제외하고 2행부터 처리
        const dataRows = jsonData.slice(1)

        // 주문번호 형식 검증 정규식 (S 또는 G로 시작, 숫자-숫자 패턴)
        const orderNumberPattern = /^[SG]\d{6}-\d{4}$/

        // 데이터 포맷팅
        const trackingData = []

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i]

          // B열 (인덱스 1): 운송장번호 (송장번호)
          const trackingNumber = row[1] ? String(row[1]).trim() : null

          // K열 (인덱스 10): 품목명 (주문번호)
          const productNameField = row[10] ? String(row[10]).trim() : null

          if (!trackingNumber || !productNameField) {
            console.log(`⚠️ 행 ${i + 2} 스킵: 송장번호 또는 주문번호 없음`)
            continue
          }

          // ⭐ K열에서 주문번호 추출 (쉼표로 구분, " / " 이후 제거)
          // 예: "S251109-6775,S251109-1889 /  2개" → ["S251109-6775", "S251109-1889"]
          let orderNumbers = productNameField
            .split('/')[0]  // " / 2개" 부분 제거
            .split(',')     // 쉼표로 분리
            .map(num => num.trim())
            .filter(num => {
              // S 또는 G로 시작하는 패턴만 포함
              const isValid = orderNumberPattern.test(num)
              if (!isValid && num) {
                console.log(`⚠️ 행 ${i + 2}: 유효하지 않은 주문번호 제외: "${num}"`)
              }
              return isValid
            })

          if (orderNumbers.length === 0) {
            console.log(`⚠️ 행 ${i + 2} 스킵: 유효한 주문번호 없음 (원본: "${productNameField}")`)
            continue
          }

          // 각 주문번호마다 별도 레코드 생성 (같은 송장번호 사용)
          orderNumbers.forEach(orderNumber => {
            trackingData.push({
              customerOrderNumber: orderNumber,
              trackingNumber: trackingNumber,
              trackingCompany: 'hanjin'  // ⭐ 기본값: 한진택배
            })
          })
        }

        if (trackingData.length === 0) {
          reject(new Error(
            `유효한 데이터가 없습니다.\n\n` +
            `확인사항:\n` +
            `- B열: 운송장번호 (송장번호)\n` +
            `- K열: 품목명 (주문번호, S/G로 시작)\n` +
            `- 주문번호 형식: S251109-6775 또는 G251109-1889\n` +
            `- 1행은 자동으로 제외됩니다`
          ))
          return
        }

        console.log(`✅ Excel 파싱 성공: ${trackingData.length}개 주문 인식`)
        resolve(trackingData)
      } catch (error) {
        reject(new Error(`Excel 파싱 오류: ${error.message}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('파일 읽기에 실패했습니다'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * 택배사 목록 (한국 주요 택배사)
 */
export const CARRIERS = [
  { value: 'cj', label: 'CJ대한통운' },
  { value: 'hanjin', label: '한진택배' },
  { value: 'lotte', label: '롯데택배' },
  { value: 'logen', label: '로젠택배' },
  { value: 'kdexp', label: '경동택배' },
  { value: 'kgb', label: 'KGB택배' },
  { value: 'epost', label: '우체국택배' },
  { value: 'cvs', label: 'GS Postbox' },
  { value: 'daesin', label: '대신택배' },
  { value: 'ilyang', label: '일양로지스' },
  { value: 'etc', label: '기타' }
]

/**
 * 송장번호 유효성 검사
 *
 * @param {string} trackingNumber - 송장번호
 * @returns {boolean} 유효 여부
 */
export function validateTrackingNumber(trackingNumber) {
  if (!trackingNumber) return false

  // 공백 제거
  const cleaned = trackingNumber.trim()

  // 최소 길이 (일반적으로 10자리 이상)
  if (cleaned.length < 10) return false

  // 숫자와 하이픈만 허용
  const pattern = /^[0-9\-]+$/
  return pattern.test(cleaned)
}

/**
 * 택배사 코드로 한글명 가져오기
 *
 * @param {string} carrier - 택배사 코드
 * @returns {string} 택배사 한글명
 */
export function getCarrierName(carrier) {
  if (!carrier) return '택배사 미지정'

  const found = CARRIERS.find(c => c.value === carrier)
  return found ? found.label : carrier
}

/**
 * 택배사 추적 URL 생성
 *
 * @param {string} carrier - 택배사 코드
 * @param {string} trackingNumber - 송장번호
 * @returns {string} 추적 URL
 */
export function getTrackingUrl(carrier, trackingNumber) {
  if (!trackingNumber) return '#'

  // carrier가 없으면 기본값 'hanjin' 사용
  const carrierCode = carrier || 'hanjin'

  // 송장번호에서 하이픈 제거 (택배사 사이트는 숫자만 받음)
  const cleanNumber = trackingNumber.replace(/-/g, '')

  // 택배사별 직접 추적 URL
  const trackingUrls = {
    cj: `https://www.cjlogistics.com/ko/tool/parcel/tracking?paramInvcNo=${cleanNumber}`,
    hanjin: `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=${cleanNumber}&schLang=KR&wblnumText=`,
    lotte: `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${cleanNumber}`,
    logen: `https://www.ilogen.com/web/personal/trace/${cleanNumber}`,
    kdexp: `https://kdexp.com/basicNewDelivery.kd?barcode=${cleanNumber}`,
    epost: `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${cleanNumber}`,
    // 기타 택배사는 스마트택배 통합 조회로 연결
    default: `https://www.smartparcel.kr/tracking?t_key=${cleanNumber}`
  }

  // 해당 택배사 URL 반환, 없으면 스마트택배 기본 URL
  return trackingUrls[carrierCode] || trackingUrls.default
}
