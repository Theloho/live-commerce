'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import useAuthStore from '@/app/stores/authStore'
import toast from 'react-hot-toast'

export default function useBroadcast(broadcastId) {
  const [broadcast, setBroadcast] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [viewers, setViewers] = useState(0)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { user } = useAuthStore()
  const messagesSubscription = useRef(null)
  const viewersSubscription = useRef(null)
  const heartbeatInterval = useRef(null)

  // TODO: Implement video streaming integration (WebRTC, HLS)
  // TODO: Add chat moderation features
  // TODO: Implement viewer reactions and effects
  // TODO: Add screen sharing capability
  // TODO: Implement broadcast recording and replay

  // Join broadcast as viewer
  const joinBroadcast = useCallback(async () => {
    if (!broadcastId) return

    try {
      // Increment viewer count
      const { error } = await supabase.rpc('join_broadcast', {
        broadcast_id: broadcastId,
        user_id: user?.id
      })

      if (error) throw error
    } catch (error) {
      console.error('Error joining broadcast:', error)
    }
  }, [broadcastId, user?.id])

  // Leave broadcast
  const leaveBroadcast = useCallback(async () => {
    if (!broadcastId) return

    try {
      const { error } = await supabase.rpc('leave_broadcast', {
        broadcast_id: broadcastId,
        user_id: user?.id
      })

      if (error) throw error
    } catch (error) {
      console.error('Error leaving broadcast:', error)
    }
  }, [broadcastId, user?.id])

  // Send chat message
  const sendMessage = useCallback(async (content, type = 'text') => {
    if (!broadcastId || !user) return

    try {
      const { error } = await supabase
        .from('broadcast_messages')
        .insert([
          {
            broadcast_id: broadcastId,
            user_id: user.id,
            content,
            type,
            user_name: user.user_metadata?.name || user.email
          }
        ])

      if (error) throw error
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('메시지 전송에 실패했습니다')
    }
  }, [broadcastId, user])

  // Send reaction (heart, like, etc.)
  const sendReaction = useCallback(async (reactionType) => {
    if (!broadcastId || !user) return

    try {
      await sendMessage(reactionType, 'reaction')
    } catch (error) {
      console.error('Error sending reaction:', error)
    }
  }, [broadcastId, user, sendMessage])

  // Get broadcast info
  useEffect(() => {
    if (!broadcastId) return

    const fetchBroadcast = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from('broadcasts')
          .select(`
            *,
            broadcaster:profiles(name, avatar_url)
          `)
          .eq('id', broadcastId)
          .single()

        if (error) throw error

        setBroadcast(data)
        setIsLive(data.status === 'live')
      } catch (error) {
        console.error('Error fetching broadcast:', error)
        setError(error.message)
        toast.error('방송 정보를 불러올 수 없습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchBroadcast()
  }, [broadcastId])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!broadcastId) return

    // Subscribe to chat messages
    messagesSubscription.current = supabase
      .channel(`broadcast-messages-${broadcastId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'broadcast_messages',
          filter: `broadcast_id=eq.${broadcastId}`
        },
        (payload) => {
          const newMessage = payload.new
          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe()

    // Subscribe to viewer count updates
    viewersSubscription.current = supabase
      .channel(`broadcast-viewers-${broadcastId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcast_viewers',
          filter: `broadcast_id=eq.${broadcastId}`
        },
        async () => {
          // Get updated viewer count
          const { data, error } = await supabase
            .from('broadcast_viewers')
            .select('id')
            .eq('broadcast_id', broadcastId)

          if (!error) {
            setViewers(data?.length || 0)
          }
        }
      )
      .subscribe()

    return () => {
      messagesSubscription.current?.unsubscribe()
      viewersSubscription.current?.unsubscribe()
    }
  }, [broadcastId])

  // Auto-join broadcast when component mounts
  useEffect(() => {
    if (broadcastId && user && isLive) {
      joinBroadcast()
    }

    return () => {
      if (broadcastId && user) {
        leaveBroadcast()
      }
    }
  }, [broadcastId, user, isLive, joinBroadcast, leaveBroadcast])

  // Heartbeat to keep viewer active
  useEffect(() => {
    if (!broadcastId || !user || !isLive) return

    heartbeatInterval.current = setInterval(() => {
      supabase.rpc('update_viewer_heartbeat', {
        broadcast_id: broadcastId,
        user_id: user.id
      })
    }, 30000) // 30 seconds

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current)
      }
    }
  }, [broadcastId, user, isLive])

  // Load initial messages
  useEffect(() => {
    if (!broadcastId) return

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('broadcast_messages')
          .select('*')
          .eq('broadcast_id', broadcastId)
          .order('created_at', { ascending: true })
          .limit(100)

        if (error) throw error

        setMessages(data || [])
      } catch (error) {
        console.error('Error fetching messages:', error)
      }
    }

    fetchMessages()
  }, [broadcastId])

  return {
    broadcast,
    isLive,
    viewers,
    messages,
    loading,
    error,
    sendMessage,
    sendReaction,
    joinBroadcast,
    leaveBroadcast
  }
}