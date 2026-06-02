import { motion } from 'framer-motion'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Check, Zap, Crown, Infinity } from 'lucide-react'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: Zap,
    color: '#6b7280',
    features: ['5 messages/day', 'Fitness Agent', 'Study Agent', 'No game builder', 'No food scanner'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$9.99',
    period: '/month',
    icon: Zap,
    color: '#3b82f6',
    popular: true,
    features: ['50 messages/day', 'All agents', '3 games/day', 'Priority support', 'No food scanner'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$24.99',
    period: '/month',
    icon: Crown,
    color: '#8b5cf6',
    features: ['200 messages/day', 'All agents', '10 games/day', 'Food scanner (vision)', 'Priority support'],
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: '$49.99',
    period: '/month',
    icon: Infinity,
    color: '#f59e0b',
    features: ['Unlimited messages', 'All agents', 'Unlimited games', 'Food scanner (vision)', 'Everything included'],
  },
]

export default function Pricing() {
  const { plan: currentPlan, checkout, openPortal } = useSubscription()
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleUpgrade = (planId) => {
    if (!user) { navigate('/signup'); return }
    if (planId === 'free') return
    if (currentPlan === planId) { openPortal(); return }
    checkout(planId)
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-3">Choose Your Plan</h1>
          <p className="text-gray-400 text-lg">Unlock the full power of your AI agents</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((p, i) => {
            const isCurrent = currentPlan === p.id
            const Icon = p.icon
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-5 relative flex flex-col ${
                  p.popular ? 'ring-2' : ''
                }`}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${p.popular ? p.color + '60' : 'rgba(255,255,255,0.08)'}`,
                  ringColor: p.popular ? p.color : undefined,
                }}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{ background: p.color }}>
                    MOST POPULAR
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full text-xs font-bold text-white bg-green-600">
                    CURRENT
                  </div>
                )}

                <div className="mb-4">
                  <Icon size={24} style={{ color: p.color }} />
                </div>

                <h3 className="text-white font-bold text-lg">{p.name}</h3>
                <div className="flex items-baseline gap-1 mt-1 mb-4">
                  <span className="text-3xl font-bold text-white">{p.price}</span>
                  <span className="text-gray-500 text-sm">{p.period}</span>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check size={14} style={{ color: p.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(p.id)}
                  disabled={isCurrent && p.id === 'free'}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-40"
                  style={{
                    background: isCurrent ? 'rgba(255,255,255,0.06)' : p.color,
                    color: isCurrent ? '#999' : '#fff',
                  }}
                >
                  {isCurrent ? (p.id === 'free' ? 'Current Plan' : 'Manage') :
                   p.id === 'free' ? 'Free Forever' : 'Upgrade'}
                </button>
              </motion.div>
            )
          })}
        </div>

        {currentPlan !== 'free' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8 text-gray-500 text-sm"
          >
            Need to manage your subscription?{' '}
            <button onClick={openPortal} className="text-blue-400 hover:text-blue-300 underline">
              Open billing portal
            </button>
          </motion.p>
        )}
      </div>
    </div>
  )
}
