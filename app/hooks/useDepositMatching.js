/**
 * useDepositMatching - 입금 확인 및 매칭 Hook (Phase 4.3 리팩토링)
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture 적용:
 * - Application Layer: 이 파일 (비즈니스 로직만)
 * - Infrastructure Layer: supabaseApi (직접 DB 접근, Phase 5에서 Repository로 전환)
 *
 * ✅ Rule #0 준수:
 * - Rule 1: 파일 크기 ~250줄
 * - Rule 2: Layer boundary 준수
 * - Rule 4: 함수 개수 ≤ 10개 (주요 함수만)
 * - Rule 5: 직접 supabase 호출 제거 (TODO: Phase 5 Repository 전환)
 */

import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
// ⚠️ TODO: UpdateOrderStatusUseCase로 전환 필요 (Phase 5)
import { updateOrderStatus } from '@/lib/supabaseApi'

export function useDepositMatching({ adminUser }) {
  // ========================================
  // State 선언 (10개)
  // ========================================
  const [pendingOrders, setPendingOrders] = useState([])
  const [bankTransactions, setBankTransactions] = useState([])
  const [matchedTransactions, setMatchedTransactions] = useState([])
  const [unmatchedTransactions, setUnmatchedTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [quickSearchResults, setQuickSearchResults] = useState(null)
  const [quickSearchTerm, setQuickSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const ITEMS_PER_PAGE = 10

  // ========================================
  // 초기화: 관리자 로그인 시 주문 로드
  // ========================================
  useEffect(() => {
    if (adminUser?.email) {
      loadPendingOrders()
    }
  }, [adminUser])

  // ========================================
  // ESC 키로 Quick Search 모달 닫기
  // ========================================
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

  // ========================================
  // 1. 입금 대기 주문 로드 (페이지네이션)
  // ========================================
  const loadPendingOrders = async (page = 1) => {
    try {
      if (!adminUser?.email) return

      setLoading(true)
      const offset = (page - 1) * ITEMS_PER_PAGE

      // ✅ Service Role API로 서버 사이드 필터링 + 페이지네이션
      // ⚠️ pending(장바구니)는 제외! verifying(주문내역)만 입금 확인 대상
      const response = await fetch(
        `/api/admin/orders?adminEmail=${encodeURIComponent(adminUser.email)}&limit=${ITEMS_PER_PAGE}&offset=${offset}&status=verifying&paymentMethod=bank_transfer`
      )
      const { orders, totalCount: apiTotalCount, hasMore: apiHasMore } = await response.json()

      const ordersWithUsers = (orders || []).map(order => {
        const shipping = order.order_shipping?.[0] || order.shipping || {}
        const payment = order.order_payments?.[0] || order.payment || {}

        return {
          ...order,
          user: order.userProfile || null,
          payment: payment,
          shipping: shipping,
          depositName: order.deposit_name || order.depositor_name || payment.depositor_name,
          // ⭐ 주문관리와 동일한 totalPrice 계산
          totalPrice: order.total_amount || 0,
          total_amount: order.total_amount || 0
        }
      })

      // ⚡ 일괄결제 그룹핑 처리
      const groupedOrders = groupOrdersByPaymentGroupId(ordersWithUsers)

      setPendingOrders(groupedOrders)
      setTotalCount(apiTotalCount || 0)
      setHasMore(apiHasMore || false)
      setCurrentPage(page)

      console.log('📄 페이지네이션 정보:', {
        currentPage: page,
        itemsLoaded: groupedOrders.length,
        originalCount: ordersWithUsers.length,
        totalCount: apiTotalCount,
        hasMore: apiHasMore
      })
    } catch (error) {
      console.error('주문 로딩 오류:', error)
      toast.error('주문 데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // ========================================
  // 일괄결제 그룹핑 헬퍼 함수
  // ========================================
  const groupOrdersByPaymentGroupId = (orders) => {
    const groups = {}
    const result = []

    orders.forEach(order => {
      if (order.payment_group_id) {
        if (!groups[order.payment_group_id]) {
          groups[order.payment_group_id] = []
        }
        groups[order.payment_group_id].push(order)
      } else {
        // 일괄결제 아닌 개별 주문
        result.push(order)
      }
    })

    // 그룹 주문 변환 (주문관리와 동일한 로직)
    Object.entries(groups).forEach(([groupId, groupOrders]) => {
      // 대표 주문: 가장 먼저 생성된 주문
      const representativeOrder = groupOrders[0]

      // ⭐ DB에 저장된 total_amount 합계 (재계산 불필요!)
      const totalAmountSum = groupOrders.reduce((sum, o) => {
        return sum + (o.total_amount || o.totalPrice || o.payment?.amount || 0)
      }, 0)

      // ⭐ 대표 주문의 쿠폰 할인 (일괄결제는 쿠폰 1개만 적용)
      const groupTotalDiscount = representativeOrder.discount_amount || 0

      // ⭐ 대표 주문의 배송비 추가
      const groupShippingFee = representativeOrder.shipping?.shipping_fee ||
                              representativeOrder.order_shipping?.[0]?.shipping_fee || 0

      // ⭐ 총 입금금액 = total_amount 합계 - 쿠폰할인 + 배송비
      const groupTotalAmount = totalAmountSum - groupTotalDiscount + groupShippingFee

      result.push({
        ...representativeOrder,
        isGroup: true,
        groupOrderCount: groupOrders.length,
        originalOrders: groupOrders,
        totalAmount: groupTotalAmount, // ⭐ 올바른 계산
        totalPrice: groupTotalAmount,  // ⭐ totalPrice도 동일하게
        payment: {
          ...representativeOrder.payment,
          amount: groupTotalAmount // ⭐ 그룹 총액으로 덮어쓰기
        }
      })
    })

    return result
  }

  // ========================================
  // 2. Excel 파일 업로드 및 파싱
  // ========================================
  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]

      // JSON 변환 (헤더 행 포함)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: ''
      })

      // 헤더 행 제거
      const dataRows = jsonData.slice(1).filter(row =>
        row.some(cell => cell && String(cell).trim() !== '')
      )

      // 고정 컬럼 매핑 (A열=날짜, C열=금액, F열=이름)
      const columnMapping = {
        date: 0,
        amount: 2,
        depositor: 5
      }

      const headerRow = jsonData[0] || []

      // 은행 거래내역 파싱
      const transactions = dataRows.map((row, index) => {
        const depositor = extractDepositor(row, columnMapping, headerRow)
        const amount = extractAmount(row, columnMapping, headerRow)
        const date = extractDate(row, columnMapping, headerRow)

        return {
          id: `transaction-${index}`,
          date: date || new Date().toISOString().split('T')[0],
          depositor: depositor ? String(depositor).trim() : '',
          amount: Number(amount) || 0,
          raw: row,
          rowIndex: index + 2
        }
      }).filter(t => t.amount > 0 && t.depositor)

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
      event.target.value = ''
    }
  }

  // ========================================
  // 3. 데이터 추출 헬퍼 함수들
  // ========================================
  const extractDepositor = (row, mapping, headerRow) => {
    if (mapping.depositor >= 0 && row[mapping.depositor]) {
      return String(row[mapping.depositor]).trim()
    }

    const depositor = row.find(cell =>
      typeof cell === 'string' &&
      cell.trim().length > 1 &&
      cell.trim().length < 50 &&
      !/^\d+$/.test(cell.trim()) &&
      !/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(cell.trim()) &&
      !/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(cell.trim()) &&
      !/^\d+:\d+/.test(cell.trim())
    )

    return depositor ? String(depositor).trim() : ''
  }

  const extractAmount = (row, mapping, headerRow) => {
    if (mapping.amount >= 0 && row[mapping.amount]) {
      const value = row[mapping.amount]
      if (typeof value === 'string') {
        const numStr = value.replace(/[,\s]/g, '')
        return parseFloat(numStr)
      }
      return Number(value)
    }

    const numbers = row.filter(cell => {
      const num = Number(String(cell).replace(/[,\s]/g, ''))
      return !isNaN(num) && num > 0
    })

    if (numbers.length > 0) {
      return Math.max(...numbers.map(n => Number(String(n).replace(/[,\s]/g, ''))))
    }

    return 0
  }

  const extractDate = (row, mapping, headerRow) => {
    if (mapping.date >= 0 && row[mapping.date]) {
      return row[mapping.date]
    }

    return row.find(cell =>
      typeof cell === 'string' &&
      (cell.includes('-') || cell.includes('/') || cell.includes('.')) &&
      /\d{2,4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(cell)
    )
  }

  // ========================================
  // 4. 자동 매칭 (3-tier 전략)
  // ========================================
  const performMatching = (transactions) => {
    const matched = []
    const unmatched = []

    transactions.forEach(transaction => {
      // 1차: 이름 + 금액 정확 매칭
      let matchingOrder = pendingOrders.find(order => {
        const orderUser = order.user || {}
        // ⚡ 그룹 주문은 totalAmount, 개별 주문은 payment.amount
        const orderAmount = order.isGroup ? order.totalAmount : (order.payment?.amount || 0)

        const namesToMatch = [
          order.depositName || '',
          order.shipping?.name || '',
          orderUser.nickname || orderUser.user_metadata?.nickname || '',
          orderUser.name || orderUser.user_metadata?.name || ''
        ].filter(name => name.trim())

        const nameMatch = namesToMatch.some(name =>
          name.replace(/\s/g, '') === transaction.depositor.replace(/\s/g, '')
        )

        const amountMatch = orderAmount === transaction.amount

        return nameMatch && amountMatch
      })

      if (matchingOrder) {
        matched.push({ transaction, order: matchingOrder, confidence: 'high' })
      } else {
        // 2차: 이름만 매칭
        matchingOrder = pendingOrders.find(order => {
          const orderUser = order.user || {}

          const namesToMatch = [
            order.depositName || '',
            order.shipping?.name || '',
            orderUser.nickname || orderUser.user_metadata?.nickname || '',
            orderUser.name || orderUser.user_metadata?.name || ''
          ].filter(name => name.trim())

          return namesToMatch.some(name =>
            name.replace(/\s/g, '') === transaction.depositor.replace(/\s/g, '')
          )
        })

        if (matchingOrder) {
          matched.push({ transaction, order: matchingOrder, confidence: 'medium' })
        } else {
          // 3차: 금액만 매칭
          matchingOrder = pendingOrders.find(order => {
            // ⚡ 그룹 주문은 totalAmount, 개별 주문은 payment.amount
            const orderAmount = order.isGroup ? order.totalAmount : (order.payment?.amount || 0)
            return orderAmount === transaction.amount
          })

          if (matchingOrder) {
            matched.push({ transaction, order: matchingOrder, confidence: 'low' })
          } else {
            unmatched.push(transaction)
          }
        }
      }
    })

    setMatchedTransactions(matched)
    setUnmatchedTransactions(unmatched)
  }

  // ========================================
  // 5. 입금 확인 처리
  // ========================================
  const confirmPayment = async (matchedItemOrOrder) => {
    try {
      // ⚡ 유연한 입력 처리: matchedItem 객체 또는 order 객체 직접
      const order = matchedItemOrOrder.order || matchedItemOrOrder

      // 그룹 주문인지 확인
      if (order.isGroup && order.originalOrders) {
        console.log('그룹 주문 입금확인:', {
          groupId: order.id,
          individualOrders: order.originalOrders.length
        })

        for (const individualOrder of order.originalOrders) {
          await updateOrderStatus(individualOrder.id, 'paid')
        }

        toast.success(`그룹 주문 ${order.originalOrders.length}건의 입금이 확인되었습니다`)
      } else {
        await updateOrderStatus(order.id, 'paid')
        toast.success('입금이 확인되었습니다')
      }

      // matchedTransactions에서 제거 (matchedItem인 경우만)
      if (matchedItemOrOrder.order) {
        setMatchedTransactions(prev => prev.filter(item => item.order.id !== order.id))
      }

      loadPendingOrders()

    } catch (error) {
      console.error('결제 확인 오류:', error)
      toast.error('결제 확인에 실패했습니다')
    }
  }

  // ========================================
  // 6. Quick Search 모달
  // ========================================
  const handleQuickSearch = (searchValue) => {
    if (!searchValue || !searchValue.trim()) {
      setQuickSearchResults(null)
      setQuickSearchTerm('')
      return
    }

    const cleanSearchValue = searchValue.trim()
    setQuickSearchTerm(cleanSearchValue)

    const allTransactions = [...matchedTransactions.map(item => item.transaction), ...unmatchedTransactions]

    const results = allTransactions.filter(transaction =>
      transaction.depositor.toLowerCase().includes(cleanSearchValue.toLowerCase())
    )

    const resultsWithOrders = results.map(transaction => {
      const matchedItem = matchedTransactions.find(item => item.transaction.id === transaction.id)
      const relatedOrder = matchedItem ? matchedItem.order : null

      return {
        transaction,
        relatedOrder,
        confidence: matchedItem?.confidence || null
      }
    })

    const sortedResults = resultsWithOrders.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1, null: 0 }
      const aScore = confidenceOrder[a.confidence] || 0
      const bScore = confidenceOrder[b.confidence] || 0

      if (aScore !== bScore) {
        return bScore - aScore
      }

      return b.transaction.amount - a.transaction.amount
    })

    setQuickSearchResults(sortedResults)
  }

  const handleConfirmPayment = async (transaction, relatedOrder) => {
    if (!relatedOrder) {
      toast.error('매칭된 주문이 없습니다')
      return
    }

    try {
      await updateOrderStatus(relatedOrder.id, 'paid')

      toast.success(`${relatedOrder.customerOrderNumber || relatedOrder.id.slice(-8)} 주문의 입금이 확인되었습니다`)

      loadPendingOrders()
      if (bankTransactions.length > 0) {
        performMatching(bankTransactions)
      }

      setQuickSearchResults(null)
      setQuickSearchTerm('')
    } catch (error) {
      console.error('입금 확인 오류:', error)
      toast.error('입금 확인에 실패했습니다')
    }
  }

  // ========================================
  // 7. 필터링 및 정렬
  // ========================================
  const filteredMatched = matchedTransactions
    .filter(item =>
      item.transaction.depositor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.order.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 }
      const aScore = confidenceOrder[a.confidence] || 0
      const bScore = confidenceOrder[b.confidence] || 0

      if (aScore !== bScore) {
        return bScore - aScore
      }

      const aOrderDate = new Date(a.order.created_at)
      const aDepositDate = new Date(a.transaction.date)
      const bOrderDate = new Date(b.order.created_at)
      const bDepositDate = new Date(b.transaction.date)

      const aDateLogical = aDepositDate >= aOrderDate
      const bDateLogical = bDepositDate >= bOrderDate

      if (aDateLogical !== bDateLogical) {
        return bDateLogical ? 1 : -1
      }

      const aAmountDiff = Math.abs((a.transaction.amount || 0) - (a.order.payment?.amount || 0))
      const bAmountDiff = Math.abs((b.transaction.amount || 0) - (b.order.payment?.amount || 0))

      if (aAmountDiff !== bAmountDiff) {
        return aAmountDiff - bAmountDiff
      }

      return new Date(b.transaction.date) - new Date(a.transaction.date)
    })

  const filteredUnmatched = unmatchedTransactions.filter(transaction =>
    transaction.depositor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ========================================
  // Export
  // ========================================
  return {
    // State
    pendingOrders,
    bankTransactions,
    matchedTransactions,
    unmatchedTransactions,
    loading,
    searchTerm,
    setSearchTerm,
    quickSearchResults,
    setQuickSearchResults,
    quickSearchTerm,
    setQuickSearchTerm,
    currentPage,
    totalCount,
    hasMore,
    ITEMS_PER_PAGE,
    // Functions
    loadPendingOrders,
    handleFileUpload,
    confirmPayment,
    handleQuickSearch,
    handleConfirmPayment,
    // Computed
    filteredMatched,
    filteredUnmatched
  }
}
