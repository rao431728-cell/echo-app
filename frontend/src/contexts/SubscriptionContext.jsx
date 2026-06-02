import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

const API = import.meta.env.VITE_API_URL || ''

const SubscriptionContext = createContext({})

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const [plan, setPlan] = useState('free')
  const [status, setStatus] = useState('active')
  const [usage, setUsage] = useState({ messages_used: 0, games_used: 0, vision_used: 0 })
  const [limits, setLimits] = useState({ messages_per_day: 5, games_per_day: 0, vision: false })
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false)
  const [periodEnd, setPeriodEnd] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSubscription = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    try {
      const res = await fetch(`${API}/api/stripe/subscription?user_id=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setPlan(data.plan || 'free')
        setStatus(data.status || 'active')
        setUsage(data.usage || { messages_used: 0, games_used: 0, vision_used: 0 })
        setLimits(data.limits || { messages_per_day: 5, games_per_day: 0, vision: false })
        setCancelAtPeriodEnd(data.cancel_at_period_end || false)
        setPeriodEnd(data.current_period_end)
      }
    } catch (e) {}
    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetchSubscription() }, [fetchSubscription])

  const canUse = (type) => {
    if (type === 'vision') return limits.vision
    const limitKey = type === 'game' ? 'games_per_day' : 'messages_per_day'
    const usedKey = type === 'game' ? 'games_used' : 'messages_used'
    const limit = limits[limitKey]
    if (limit === null) return true
    return usage[usedKey] < limit
  }

  const checkout = async (planName) => {
    try {
      const res = await fetch(`${API}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, plan: planName, email: user.email }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) {}
  }

  const openPortal = async () => {
    try {
      const res = await fetch(`${API}/api/stripe/create-portal-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) {}
  }

  return (
    <SubscriptionContext.Provider value={{
      plan, status, usage, limits, loading, cancelAtPeriodEnd, periodEnd,
      canUse, checkout, openPortal, refreshSubscription: fetchSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  return useContext(SubscriptionContext)
}
