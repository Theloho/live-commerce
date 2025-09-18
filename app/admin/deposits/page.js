'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import * as XLSX from 'xlsx'
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function AdminDepositsPage() {
  const router = useRouter()
  const [pendingOrders, setPendingOrders] = useState([])
  const [bankTransactions, setBankTransactions] = useState([])
  const [matchedTransactions, setMatchedTransactions] = useState([])
  const [unmatchedTransactions, setUnmatchedTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [quickSearchResults, setQuickSearchResults] = useState(null)
  const [quickSearchTerm, setQuickSearchTerm] = useState('')

  useEffect(() => {
    loadPendingOrders()
  }, [])

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && quickSearchResults) {
        setQuickSearchResults(null)
        setQuickSearchTerm('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [quickSearchResults])

  const loadPendingOrders = () => {
    try {
      const orders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
      // 계좌이체 결제대기/확인중 주문만 필터링
      const bankTransferOrders = orders.filter(order =>
        order.payment?.method === 'bank_transfer' &&
        (order.status === 'pending' || order.status === 'verifying')
      )
      setPendingOrders(bankTransferOrders)
    } catch (error) {
      console.error('주문 로딩 오류:', error)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]

      // 원본 데이터와 헤더 확인
      const range = XLSX.utils.decode_range(worksheet['!ref'])
      console.log('엑셀 파일 범위:', range)
      console.log('총 행 수:', range.e.r + 1)
      console.log('총 열 수:', range.e.c + 1)

      // 헤더 확인 (첫 번째 행)
      const headers = {}
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = worksheet[XLSX.utils.encode_cell({r: 0, c: C})]
        if (headerCell && headerCell.v) {
          headers[C] = headerCell.v
        }
      }
      console.log('발견된 헤더:', headers)

      // JSON 변환 (옵션으로 헤더 행 처리)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // 첫 번째 행을 헤더로 사용
        raw: false, // 텍스트로 변환
        defval: '' // 빈 셀 기본값
      })

      console.log('전체 데이터 행 수:', jsonData.length)
      console.log('첫 3행 샘플:', jsonData.slice(0, 3))

      // 헤더 행 제거 (첫 번째 행이 헤더인 경우)
      const dataRows = jsonData.slice(1).filter(row =>
        row.some(cell => cell && String(cell).trim() !== '')
      )

      console.log('데이터 행 수 (헤더 제외):', dataRows.length)

      // 고정 컬럼 매핑 (A열=날짜, C열=금액, F열=이름)
      const columnMapping = {
        date: 0,    // A열 (0-based index)
        amount: 2,  // C열 (0-based index)
        depositor: 5 // F열 (0-based index)
      }
      console.log('고정 컬럼 매핑:', columnMapping)

      // 은행 거래내역 파싱
      const headerRow = jsonData[0] || [] // 헤더 행 정의
      const transactions = dataRows.map((row, index) => {
        const depositor = extractDepositor(row, columnMapping, headerRow)
        const amount = extractAmount(row, columnMapping, headerRow)
        const date = extractDate(row, columnMapping, headerRow)

        const transaction = {
          id: `transaction-${index}`,
          date: date || new Date().toISOString().split('T')[0],
          depositor: depositor ? String(depositor).trim() : '',
          amount: Number(amount) || 0,
          raw: row,
          rowIndex: index + 2 // 실제 엑셀 행 번호 (헤더 포함)
        }

        console.log(`행 ${transaction.rowIndex}:`, {
          depositor: transaction.depositor,
          amount: transaction.amount,
          date: transaction.date
        })

        return transaction
      }).filter(t => t.amount > 0 && t.depositor) // 유효한 거래만 필터링

      console.log('최종 유효한 거래 수:', transactions.length)
      setBankTransactions(transactions)

      // 자동 매칭 실행
      performMatching(transactions)

      toast.success(`총 ${dataRows.length}행 중 ${transactions.length}건의 유효한 거래내역을 발견했습니다`)
    } catch (error) {
      console.error('파일 업로드 오류:', error)
      toast.error('파일 업로드에 실패했습니다. 엑셀 형식을 확인해주세요.')
    } finally {
      setLoading(false)
      // 파일 input 초기화
      event.target.value = ''
    }
  }

  // 컬럼 자동 감지 함수
  const detectColumns = (headerRow) => {
    const mapping = { depositor: -1, amount: -1, date: -1 }

    headerRow.forEach((header, index) => {
      const headerStr = String(header || '').toLowerCase()

      // 입금자 컬럼 감지
      if (headerStr.includes('입금자') || headerStr.includes('거래상대') ||
          headerStr.includes('예금주') || headerStr.includes('송금인') ||
          headerStr.includes('입금인') || headerStr.includes('name')) {
        mapping.depositor = index
      }

      // 금액 컬럼 감지
      if (headerStr.includes('입금액') || headerStr.includes('거래금액') ||
          headerStr.includes('금액') || headerStr.includes('amount') ||
          headerStr.includes('입금') || headerStr.includes('수입')) {
        mapping.amount = index
      }

      // 날짜 컬럼 감지
      if (headerStr.includes('거래일') || headerStr.includes('날짜') ||
          headerStr.includes('일자') || headerStr.includes('date') ||
          headerStr.includes('시간')) {
        mapping.date = index
      }
    })

    return mapping
  }

  // 입금자 추출 함수
  const extractDepositor = (row, mapping, headerRow) => {
    const cleanupDepositorName = (text) => {
      if (!text) return ''
      let cleaned = String(text).trim()

      // 날짜 패턴 제거
      cleaned = cleaned.replace(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/g, '')
      cleaned = cleaned.replace(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/g, '')

      // 시간 패턴 제거
      cleaned = cleaned.replace(/\d{1,2}:\d{2}(:\d{2})?/g, '')

      // 거래 유형 관련 단어 제거
      cleaned = cleaned.replace(/입금/g, '').replace(/출금/g, '')
      cleaned = cleaned.replace(/송금/g, '').replace(/이체/g, '')
      cleaned = cleaned.replace(/입출금/g, '').replace(/거래/g, '')
      cleaned = cleaned.replace(/계좌/g, '').replace(/통장/g, '')

      // 특수문자와 공백 정리
      cleaned = cleaned.replace(/[()[\]{}]/g, '').replace(/\s+/g, ' ').trim()

      return cleaned
    }

    // 매핑된 컬럼이 있으면 사용
    if (mapping.depositor >= 0 && row[mapping.depositor]) {
      return cleanupDepositorName(row[mapping.depositor])
    }

    // 매핑이 없으면 휴리스틱으로 찾기
    const depositor = row.find(cell =>
      typeof cell === 'string' &&
      cell.trim().length > 1 &&
      cell.trim().length < 50 &&
      !/^\d+$/.test(cell.trim()) && // 숫자만 있는 문자열 제외
      !/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(cell.trim()) && // 날짜 형식 제외
      !/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(cell.trim()) && // 날짜 형식 제외
      !/^\d+:\d+/.test(cell.trim()) && // 시간 형식 제외
      !cell.includes('시간') && !cell.includes('시') &&
      !cell.includes('잔액') && !cell.includes('수수료') &&
      !/^(입금|출금|송금|이체)$/.test(cell.trim()) // 거래 유형만 있는 것 제외
    )

    return cleanupDepositorName(depositor)
  }

  // 금액 추출 함수
  const extractAmount = (row, mapping, headerRow) => {
    // 매핑된 컬럼이 있으면 사용
    if (mapping.amount >= 0 && row[mapping.amount]) {
      const value = row[mapping.amount]
      // 문자열에서 숫자만 추출 (쉼표 제거)
      if (typeof value === 'string') {
        const numStr = value.replace(/[,\s]/g, '')
        return parseFloat(numStr)
      }
      return Number(value)
    }

    // 매핑이 없으면 가장 큰 양수 찾기
    const numbers = row.filter(cell => {
      const num = Number(String(cell).replace(/[,\s]/g, ''))
      return !isNaN(num) && num > 0
    })

    if (numbers.length > 0) {
      return Math.max(...numbers.map(n => Number(String(n).replace(/[,\s]/g, ''))))
    }

    return 0
  }

  // 날짜 추출 함수
  const extractDate = (row, mapping, headerRow) => {
    // 매핑된 컬럼이 있으면 사용
    if (mapping.date >= 0 && row[mapping.date]) {
      return row[mapping.date]
    }

    // 매핑이 없으면 날짜 형식 찾기
    return row.find(cell =>
      typeof cell === 'string' &&
      (cell.includes('-') || cell.includes('/') || cell.includes('.')) &&
      /\d{2,4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(cell)
    )
  }

  const performMatching = (transactions) => {
    const matched = []
    const unmatched = []

    transactions.forEach(transaction => {
      // 먼저 사용자 정보 로드
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]')

      // 1차: 입금자명과 주문자 정보 정확 매칭 + 금액 일치
      let matchingOrder = pendingOrders.find(order => {
        const orderUser = users.find(u => u.id === order.userId)
        const orderAmount = order.payment?.amount || 0

        // 매칭할 이름들: 입금자명, 주문자명, 닉네임, 사용자 이름
        const namesToMatch = [
          order.depositName || '',
          order.shipping?.name || '',
          orderUser?.nickname || orderUser?.user_metadata?.nickname || '',
          orderUser?.name || orderUser?.user_metadata?.name || ''
        ].filter(name => name.trim())

        // 입금자명과 이름들 매칭 (공백 제거 후 비교)
        const nameMatch = namesToMatch.some(name =>
          name.replace(/\s/g, '') === transaction.depositor.replace(/\s/g, '')
        )

        // 금액 매칭 (정확히 일치)
        const amountMatch = orderAmount === transaction.amount

        return nameMatch && amountMatch
      })

      if (matchingOrder) {
        matched.push({
          transaction,
          order: matchingOrder,
          confidence: 'high'
        })
      } else {
        // 2차: 입금자명만 매칭 (금액 무관)
        matchingOrder = pendingOrders.find(order => {
          const orderUser = users.find(u => u.id === order.userId)

          const namesToMatch = [
            order.depositName || '',
            order.shipping?.name || '',
            orderUser?.nickname || orderUser?.user_metadata?.nickname || '',
            orderUser?.name || orderUser?.user_metadata?.name || ''
          ].filter(name => name.trim())

          return namesToMatch.some(name =>
            name.replace(/\s/g, '') === transaction.depositor.replace(/\s/g, '')
          )
        })

        if (matchingOrder) {
          matched.push({
            transaction,
            order: matchingOrder,
            confidence: 'medium'
          })
        } else {
          // 3차: 금액만 매칭 (이름 무관)
          matchingOrder = pendingOrders.find(order => {
            const orderAmount = order.payment?.amount || 0
            return orderAmount === transaction.amount
          })

          if (matchingOrder) {
            matched.push({
              transaction,
              order: matchingOrder,
              confidence: 'low'
            })
          } else {
            unmatched.push(transaction)
          }
        }
      }
    })

    setMatchedTransactions(matched)
    setUnmatchedTransactions(unmatched)
  }

  const confirmPayment = (matchedItem) => {
    try {
      // 주문 상태를 'paid'로 변경
      const orders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
      const updatedOrders = orders.map(order =>
        order.id === matchedItem.order.id
          ? { ...order, status: 'paid', paid_at: new Date().toISOString() }
          : order
      )

      localStorage.setItem('mock_orders', JSON.stringify(updatedOrders))

      // 매칭된 항목에서 제거
      setMatchedTransactions(prev => prev.filter(item => item.order.id !== matchedItem.order.id))

      // 대기 주문 목록 새로고침
      loadPendingOrders()

      toast.success('입금이 확인되었습니다')
    } catch (error) {
      console.error('결제 확인 오류:', error)
      toast.error('결제 확인에 실패했습니다')
    }
  }

  const handleQuickSearch = (searchValue) => {
    if (!searchValue || !searchValue.trim()) {
      setQuickSearchResults(null)
      setQuickSearchTerm('')
      return
    }

    const cleanSearchValue = searchValue.trim()
    setQuickSearchTerm(cleanSearchValue)

    // 모든 거래 데이터에서 검색 (매칭된 것과 매칭되지 않은 것 모두)
    const allTransactions = [...matchedTransactions.map(item => item.transaction), ...unmatchedTransactions]

    const results = allTransactions.filter(transaction =>
      transaction.depositor.toLowerCase().includes(cleanSearchValue.toLowerCase())
    )

    // 검색된 거래내역에 대응하는 주문 정보도 함께 준비
    const resultsWithOrders = results.map(transaction => {
      // 매칭된 주문 찾기
      const matchedItem = matchedTransactions.find(item => item.transaction.id === transaction.id)
      const relatedOrder = matchedItem ? matchedItem.order : null

      return {
        transaction,
        relatedOrder,
        confidence: matchedItem?.confidence || null
      }
    })

    // 매칭 신뢰도 높은 순서로 정렬
    const sortedResults = resultsWithOrders.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1, null: 0 }
      const aScore = confidenceOrder[a.confidence] || 0
      const bScore = confidenceOrder[b.confidence] || 0

      if (aScore !== bScore) {
        return bScore - aScore // 높은 신뢰도가 먼저
      }

      // 신뢰도가 같으면 입금액순 (큰 금액부터)
      return b.transaction.amount - a.transaction.amount
    })

    setQuickSearchResults(sortedResults)
  }

  const handleConfirmPayment = (transaction, relatedOrder) => {
    if (!relatedOrder) {
      toast.error('매칭된 주문이 없습니다')
      return
    }

    try {
      const orders = JSON.parse(localStorage.getItem('mock_orders') || '[]')
      const orderIndex = orders.findIndex(order => order.id === relatedOrder.id)

      if (orderIndex === -1) {
        toast.error('주문을 찾을 수 없습니다')
        return
      }

      // 주문 상태를 paid로 변경
      orders[orderIndex].status = 'paid'
      orders[orderIndex].paid_at = new Date().toISOString()
      orders[orderIndex].payment.status = 'confirmed'

      localStorage.setItem('mock_orders', JSON.stringify(orders))
      toast.success(`${relatedOrder.customerOrderNumber || relatedOrder.id.slice(-8)} 주문의 입금이 확인되었습니다`)

      // 데이터 새로고침
      loadPendingOrders()
      if (bankTransactions.length > 0) {
        processTransactions(bankTransactions)
      }

      // 모달 닫기
      setQuickSearchResults(null)
      setQuickSearchTerm('')
    } catch (error) {
      console.error('입금 확인 오류:', error)
      toast.error('입금 확인에 실패했습니다')
    }
  }

  const filteredMatched = matchedTransactions
    .filter(item =>
      item.transaction.depositor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.order.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // 신뢰도 순서로 정렬 (high > medium > low)
      const confidenceOrder = { high: 3, medium: 2, low: 1 }
      const aScore = confidenceOrder[a.confidence] || 0
      const bScore = confidenceOrder[b.confidence] || 0

      if (aScore !== bScore) {
        return bScore - aScore // 높은 신뢰도가 먼저
      }

      // 신뢰도가 같으면 날짜 논리성 검사 (입금일이 주문일 이후인지)
      const aOrderDate = new Date(a.order.created_at)
      const aDepositDate = new Date(a.transaction.date)
      const bOrderDate = new Date(b.order.created_at)
      const bDepositDate = new Date(b.transaction.date)

      const aDateLogical = aDepositDate >= aOrderDate // 입금일이 주문일 이후인가?
      const bDateLogical = bDepositDate >= bOrderDate

      if (aDateLogical !== bDateLogical) {
        return bDateLogical ? 1 : -1 // 논리적으로 맞는 것이 먼저
      }

      // 날짜 논리성이 같으면 금액 차이가 작은 순으로 정렬
      const aAmountDiff = Math.abs((a.transaction.amount || 0) - (a.order.payment?.amount || 0))
      const bAmountDiff = Math.abs((b.transaction.amount || 0) - (b.order.payment?.amount || 0))

      if (aAmountDiff !== bAmountDiff) {
        return aAmountDiff - bAmountDiff // 금액 차이가 작은 것이 먼저
      }

      // 금액 차이도 같으면 날짜 순으로 정렬 (최신이 먼저)
      return new Date(b.transaction.date) - new Date(a.transaction.date)
    })

  const filteredUnmatched = unmatchedTransactions.filter(transaction =>
    transaction.depositor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">입금 확인</h1>
          <p className="text-gray-600">은행 거래내역을 업로드하여 자동으로 입금을 확인하세요</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadPendingOrders}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">입금 대기</p>
              <p className="text-2xl font-bold text-yellow-700">{pendingOrders.length}</p>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">매칭 완료</p>
              <p className="text-2xl font-bold text-green-700">{matchedTransactions.length}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">매칭 실패</p>
              <p className="text-2xl font-bold text-red-700">{unmatchedTransactions.length}</p>
            </div>
            <XCircleIcon className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">총 거래건</p>
              <p className="text-2xl font-bold text-blue-700">{bankTransactions.length}</p>
            </div>
            <DocumentArrowUpIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">은행 거래내역 업로드</h2>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">엑셀 파일을 업로드하세요</p>
            <p className="text-sm text-gray-600">
              .xlsx, .xls 형식의 은행 거래내역 파일을 지원합니다
            </p>
          </div>

          <div className="mt-6">
            <label className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 cursor-pointer transition-colors">
              <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
              파일 선택
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading}
              />
            </label>
          </div>
        </div>

        {/* Upload Instructions */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">📋 업로드 가이드</h3>
          <div className="bg-white rounded-lg p-3 mb-3">
            <h4 className="font-semibold text-blue-900 mb-2">✅ 엑셀 형식 (고정 열 위치)</h4>
            <div className="grid grid-cols-6 gap-1 text-xs">
              <div className="bg-green-100 p-2 rounded text-center font-medium">A열<br/>날짜</div>
              <div className="bg-gray-100 p-2 rounded text-center">B열</div>
              <div className="bg-green-100 p-2 rounded text-center font-medium">C열<br/>금액</div>
              <div className="bg-gray-100 p-2 rounded text-center">D열</div>
              <div className="bg-gray-100 p-2 rounded text-center">E열</div>
              <div className="bg-green-100 p-2 rounded text-center font-medium">F열<br/>입금자명</div>
            </div>
            <div className="text-center mt-2 text-xs text-gray-600">
              녹색 열만 사용됩니다 (A열: 날짜, C열: 금액, F열: 입금자명)
            </div>
          </div>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>A열:</strong> 거래일 (예: 2024-01-15)</li>
            <li>• <strong>C열:</strong> 금액 (예: 50000)</li>
            <li>• <strong>F열:</strong> 입금자명 (예: 홍길동)</li>
            <li>• 첫 번째 행이 헤더여도 자동으로 처리됩니다</li>
            <li>• 시스템이 자동으로 주문과 매칭을 시도합니다</li>
          </ul>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">거래내역을 분석하고 매칭하는 중...</p>
        </div>
      )}

      {/* Search */}
      {(matchedTransactions.length > 0 || unmatchedTransactions.length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="입금자명, 주문번호로 검색 (매칭 실패한 거래 포함)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            {searchTerm && filteredUnmatched.length > 0 && (
              <div className="text-sm text-gray-600">
                매칭 실패: {filteredUnmatched.length}건
              </div>
            )}
          </div>

          {/* 검색 시 매칭 실패한 거래 표시 */}
          {searchTerm && filteredUnmatched.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <h3 className="text-sm font-medium text-red-800 mb-2">🔍 검색된 매칭 실패 거래</h3>
              <div className="space-y-2">
                {filteredUnmatched.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="text-sm">
                    <span className="font-medium text-red-700">{transaction.depositor}</span>
                    <span className="text-gray-600 ml-2">₩{transaction.amount.toLocaleString()}</span>
                    <span className="text-gray-500 ml-2">{transaction.date}</span>
                  </div>
                ))}
                {filteredUnmatched.length > 5 && (
                  <div className="text-xs text-gray-500">외 {filteredUnmatched.length - 5}건 더...</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Search Modal */}
      {quickSearchResults && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-blue-50 px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-blue-900">
                🔍 &quot;{quickSearchTerm}&quot; 검색 결과 ({quickSearchResults.length}건)
              </h2>
              <button
                onClick={() => {
                  setQuickSearchResults(null)
                  setQuickSearchTerm('')
                }}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 rounded hover:bg-blue-100 transition-colors"
              >
                닫기 ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[60vh]">
              {quickSearchResults.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {quickSearchResults.map((item, index) => (
                    <motion.div
                      key={item.transaction.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 hover:bg-gray-50"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <p className="font-medium text-gray-900">{item.transaction.depositor}</p>
                              {item.confidence && (
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                  item.confidence === 'high' ? 'bg-green-100 text-green-800' :
                                  item.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {item.confidence === 'high' ? '높은 매칭' :
                                   item.confidence === 'medium' ? '보통 매칭' : '낮은 매칭'}
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-700">거래 정보</p>
                                <p className="text-sm text-gray-600">
                                  입금액: ₩{item.transaction.amount.toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                  입금일: {item.transaction.date}
                                </p>
                                <p className="text-xs text-gray-400">
                                  엑셀 {item.transaction.rowIndex}행
                                </p>
                              </div>

                              {item.relatedOrder && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700">매칭된 주문</p>
                                  <p className="text-sm text-gray-600">
                                    주문금액: ₩{item.relatedOrder.payment?.amount.toLocaleString()}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    주문일: {new Date(item.relatedOrder.created_at).toLocaleDateString('ko-KR')}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    주문번호: {item.relatedOrder.customerOrderNumber || item.relatedOrder.id.slice(-8)}
                                  </p>
                                </div>
                              )}
                            </div>

                            {item.relatedOrder && (
                              <div className="flex items-center gap-2 pt-2">
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                  Math.abs(item.transaction.amount - (item.relatedOrder.payment?.amount || 0)) === 0
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  금액차이: ₩{Math.abs(item.transaction.amount - (item.relatedOrder.payment?.amount || 0)).toLocaleString()}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            {!item.relatedOrder ? (
                              <div className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                                미매칭
                              </div>
                            ) : (
                              <>
                                <div className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                                  매칭됨
                                </div>
                                {item.relatedOrder.status === 'pending' && (
                                  <button
                                    onClick={() => handleConfirmPayment(item.transaction, item.relatedOrder)}
                                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                                  >
                                    입금확인
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500">&quot;{quickSearchTerm}&quot;와 일치하는 거래를 찾을 수 없습니다.</p>
                  <p className="text-gray-400 text-sm mt-1">업로드된 엑셀 파일에서 입금자명을 검색합니다.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>엑셀 파일에서 검색된 결과입니다</span>
                <button
                  onClick={() => {
                    setQuickSearchResults(null)
                    setQuickSearchTerm('')
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Matched Transactions */}
      {filteredMatched.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-green-50 px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-green-900">🎯 매칭된 거래 ({filteredMatched.length}건)</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredMatched.map((item, index) => (
              <motion.div
                key={`${item.transaction.id}-${item.order.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50"
              >
                <div className="space-y-4">
                  {/* 매칭 상태 및 액션 */}
                  <div className="flex items-center justify-between">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.confidence === 'high'
                        ? 'bg-green-100 text-green-800'
                        : item.confidence === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {item.confidence === 'high' ? '✅ 이름+금액 일치' :
                       item.confidence === 'medium' ? '⚠️ 이름만 일치' :
                       '🔶 금액만 일치'}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmPayment(item)}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        입금 확인
                      </button>
                      <button
                        onClick={() => router.push(`/admin/customers/${item.order.userId}`)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="고객 상세보기"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 스마트 매칭 비교 레이아웃 */}
                  <div className="grid grid-cols-12 gap-2 md:gap-4">
                    {/* 좌측: 주문 정보 (5칸) */}
                    <div className="col-span-5 rounded-lg p-3 md:p-4 border-l-4 border-blue-500">
                      <h3 className="font-semibold text-gray-900 mb-2 md:mb-3 flex items-center gap-1 md:gap-2 text-sm md:text-base">
                        📦 <span className="hidden sm:inline">주문 정보</span><span className="sm:hidden">주문</span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-1 md:px-2 py-1 rounded">ORDER</span>
                      </h3>
                      <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
                        {(() => {
                          const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
                          const orderUser = users.find(u => u.id === item.order.userId)

                          // 매칭되는 이름 찾기
                          const depositorName = item.transaction.depositor
                          const orderNames = [
                            { label: '입금자명', value: item.order.depositName || '', key: 'depositName' },
                            { label: '주문자', value: item.order.shipping?.name || '', key: 'orderName' },
                            { label: '닉네임', value: orderUser?.nickname || orderUser?.user_metadata?.nickname || '', key: 'nickname' }
                          ].filter(name => name.value)

                          // 매칭되는 이름 찾기
                          const matchedName = orderNames.find(name =>
                            name.value.replace(/\s/g, '') === depositorName.replace(/\s/g, '')
                          )

                          const orderDate = new Date(item.order.created_at)
                          const depositDate = new Date(item.transaction.date)
                          const dateDiff = Math.ceil((depositDate - orderDate) / (1000 * 60 * 60 * 24))

                          const amountDiff = item.transaction.amount - item.order.payment?.amount

                          return (
                            <>
                              {/* 매칭된 이름을 먼저 표시 */}
                              {matchedName && (
                                <div className="flex justify-between border-l-2 border-green-500 pl-2 py-1">
                                  <span className="text-gray-900 font-medium">{matchedName.label}:</span>
                                  <span className="font-bold text-gray-900 text-right">✓ {matchedName.value}</span>
                                </div>
                              )}

                              {/* 매칭되지 않은 이름들 */}
                              {orderNames.filter(name => !matchedName || name.key !== matchedName.key).map(name => (
                                <div key={name.key} className="flex justify-between py-1 opacity-50">
                                  <span className="text-gray-900 font-medium">{name.label}:</span>
                                  <span className="font-bold text-gray-900 text-right">{name.value}</span>
                                </div>
                              ))}

                              {/* 주문금액 - 입금금액과 같은 행 배치 */}
                              <div className="flex justify-between py-1">
                                <span className="text-gray-900 font-medium">주문금액:</span>
                                <span className="font-bold text-gray-900 text-right">₩{item.order.payment?.amount.toLocaleString()}</span>
                              </div>

                              {/* 주문날짜 - 입금날짜와 같은 행 배치 */}
                              <div className="flex justify-between py-1">
                                <span className="text-gray-900 font-medium">주문날짜:</span>
                                <span className="text-gray-900 text-right">{orderDate.toLocaleDateString('ko-KR')}</span>
                              </div>

                              <div className="flex justify-between py-1">
                                <span className="text-gray-900 font-medium">주문번호:</span>
                                <span className="font-mono text-xs text-gray-600 text-right">{item.order.customerOrderNumber || item.order.id.slice(-8)}</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>

                    {/* 중간: 매칭 정보 (2칸) */}
                    <div className="col-span-2 flex flex-col justify-center">
                      {(() => {
                        const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
                        const orderUser = users.find(u => u.id === item.order.userId)
                        const depositorName = item.transaction.depositor
                        const orderNames = [
                          { label: '입금자명', value: item.order.depositName || '', key: 'depositName' },
                          { label: '주문자', value: item.order.shipping?.name || '', key: 'orderName' },
                          { label: '닉네임', value: orderUser?.nickname || '', key: 'nickname' }
                        ].filter(name => name.value)

                        const matchedName = orderNames.find(name =>
                          name.value.replace(/\s/g, '') === depositorName.replace(/\s/g, '')
                        )

                        const orderDate = new Date(item.order.created_at)
                        const depositDate = new Date(item.transaction.date)
                        const dateDiff = Math.ceil((depositDate - orderDate) / (1000 * 60 * 60 * 24))
                        const amountDiff = item.transaction.amount - item.order.payment?.amount

                        return (
                          <div className="space-y-1 md:space-y-2 text-xs text-center">
                            {/* 이름 매칭 상태 */}
                            {matchedName && (
                              <div className="bg-green-100 rounded px-1 py-1">
                                <span className="text-green-700 font-bold">✓</span>
                              </div>
                            )}
                            {orderNames.filter(name => !matchedName || name.key !== matchedName.key).map(name => (
                              <div key={name.key} className="bg-red-100 rounded px-1 py-1">
                                <span className="text-red-700 font-bold">✗</span>
                              </div>
                            ))}

                            {/* 금액 매칭 상태 */}
                            <div className={`rounded px-1 py-1 ${amountDiff === 0 ? 'bg-green-100' : 'bg-orange-100'}`}>
                              {amountDiff === 0 ? (
                                <span className="text-green-700 font-bold">✓</span>
                              ) : (
                                <span className={`font-bold text-xs ${amountDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {amountDiff > 0 ? '+' : ''}₩{Math.abs(amountDiff).toLocaleString()}
                                </span>
                              )}
                            </div>

                            {/* 날짜 매칭 상태 */}
                            <div className={`rounded px-1 py-1 ${
                              dateDiff === 0 ? 'bg-green-100' :
                              dateDiff > 0 ? 'bg-blue-100' :
                              'bg-red-100'
                            }`}>
                              {dateDiff === 0 ? (
                                <span className="text-green-700 font-bold">✓</span>
                              ) : dateDiff > 0 ? (
                                <span className="text-blue-600 font-bold text-xs">+{dateDiff}일</span>
                              ) : (
                                <span className="text-red-600 font-bold text-xs">⚠️</span>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    {/* 우측: 입금 정보 (5칸) */}
                    <div className="col-span-5 rounded-lg p-3 md:p-4 border-r-4 border-green-500">
                      <h3 className="font-semibold text-gray-900 mb-2 md:mb-3 flex items-center justify-end gap-1 md:gap-2 text-sm md:text-base">
                        <span className="text-xs bg-gray-200 text-gray-700 px-1 md:px-2 py-1 rounded">BANK</span>
                        <span className="hidden sm:inline">입금 정보</span><span className="sm:hidden">입금</span> 💰
                      </h3>
                      <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
                        {(() => {
                          const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
                          const orderUser = users.find(u => u.id === item.order.userId)

                          const depositorName = item.transaction.depositor
                          const orderNames = [
                            { label: '입금자명', value: item.order.depositName || '', key: 'depositName' },
                            { label: '주문자', value: item.order.shipping?.name || '', key: 'orderName' },
                            { label: '닉네임', value: orderUser?.nickname || orderUser?.user_metadata?.nickname || '', key: 'nickname' }
                          ].filter(name => name.value)

                          const matchedName = orderNames.find(name =>
                            name.value.replace(/\s/g, '') === depositorName.replace(/\s/g, '')
                          )

                          const orderDate = new Date(item.order.created_at)
                          const depositDate = new Date(item.transaction.date)
                          const dateDiff = Math.ceil((depositDate - orderDate) / (1000 * 60 * 60 * 24))
                          const amountDiff = item.transaction.amount - item.order.payment?.amount

                          return (
                            <>
                              {/* 매칭된 이름과 같은 행에 입금자명 표시 */}
                              {matchedName && (
                                <div className="flex justify-between border-r-2 border-green-500 pr-2 py-1">
                                  <span className="font-bold text-gray-900">✓ {depositorName}</span>
                                  <span className="text-gray-900 font-medium">:입금자명</span>
                                </div>
                              )}

                              {/* 매칭되지 않은 이름들만큼 빈 공간 */}
                              {orderNames.filter(name => !matchedName || name.key !== matchedName.key).map(name => (
                                <div key={name.key} className="flex justify-between py-1 opacity-50">
                                  <span className="font-bold text-gray-900">{depositorName}</span>
                                  <span className="text-gray-900 font-medium">:입금자명</span>
                                </div>
                              ))}

                              {/* 입금금액 - 주문금액과 같은 행 */}
                              <div className="flex justify-between py-1">
                                <span className="font-bold text-gray-900">₩{item.transaction.amount.toLocaleString()}</span>
                                <span className="text-gray-900 font-medium">:입금금액</span>
                              </div>

                              {/* 입금날짜 - 주문날짜와 같은 행 */}
                              <div className="flex justify-between py-1">
                                <span className="text-gray-900">{depositDate.toLocaleDateString('ko-KR')}</span>
                                <span className="text-gray-900 font-medium">:입금날짜</span>
                              </div>

                              {/* 카카오 채팅 링크 */}
                              <div className="flex justify-between py-1">
                                {(() => {
                                  const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
                                  const orderUser = users.find(u => u.id === item.order.userId)

                                  if (orderUser?.kakaoLink) {
                                    return (
                                      <>
                                        <button
                                          onClick={() => window.open(orderUser.kakaoLink, '_blank')}
                                          className="text-yellow-600 hover:text-yellow-700 font-medium text-xs px-2 py-1 bg-yellow-50 rounded hover:bg-yellow-100 transition-colors"
                                        >
                                          💬 카카오 문의
                                        </button>
                                        <span className="text-gray-900 font-medium">:고객문의</span>
                                      </>
                                    )
                                  } else {
                                    return (
                                      <>
                                        <span className="text-gray-400 text-xs">링크 미설정</span>
                                        <span className="text-gray-900 font-medium">:고객문의</span>
                                      </>
                                    )
                                  }
                                })()}
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}


      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-yellow-50 px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-yellow-900">⏳ 입금 대기 주문 ({pendingOrders.length}건)</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {pendingOrders.slice(0, 10).map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {(() => {
                      const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
                      const orderUser = users.find(u => u.id === order.userId)
                      return (
                        <div>
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="text-gray-500">이름:</span>
                              <button
                                onClick={() => handleQuickSearch(orderUser?.name || order.shipping?.name)}
                                className="text-blue-600 ml-1 font-medium hover:text-blue-800 hover:underline transition-colors"
                                disabled={!orderUser?.name && !order.shipping?.name}
                              >
                                {orderUser?.name || order.shipping?.name || '정보없음'}
                              </button>
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-500">닉네임:</span>
                              <button
                                onClick={() => handleQuickSearch(orderUser?.nickname || orderUser?.user_metadata?.nickname)}
                                className="text-purple-600 ml-1 font-medium hover:text-purple-800 hover:underline transition-colors"
                                disabled={!orderUser?.nickname && !orderUser?.user_metadata?.nickname}
                              >
                                {orderUser?.nickname || orderUser?.user_metadata?.nickname || '정보없음'}
                              </button>
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-500">입금자명:</span>
                              <button
                                onClick={() => handleQuickSearch(order.depositName)}
                                className={`ml-1 font-medium hover:underline transition-colors ${
                                  order.depositName
                                    ? "text-green-600 hover:text-green-800"
                                    : "text-red-500 cursor-not-allowed"
                                }`}
                                disabled={!order.depositName}
                              >
                                {order.depositName || '미설정'}
                              </button>
                            </p>
                          </div>
                        </div>
                      )
                    })()}
                    <p className="text-sm text-gray-500">
                      주문번호: {order.customerOrderNumber || order.id.slice(-8)} • ₩{order.payment?.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
                      const orderUser = users.find(u => u.id === order.userId)

                      if (orderUser?.kakaoLink) {
                        return (
                          <button
                            onClick={() => window.open(orderUser.kakaoLink, '_blank')}
                            className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors"
                            title="카카오톡 채팅"
                          >
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                          </button>
                        )
                      }
                      return null
                    })()}
                    <button
                      onClick={() => router.push(`/admin/customers/${order.userId}`)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="고객 상세보기"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {pendingOrders.length > 10 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                외 {pendingOrders.length - 10}건 더...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}