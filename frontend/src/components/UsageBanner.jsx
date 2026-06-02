import { useSubscription } from '../contexts/SubscriptionContext'
import { useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'

export default function UsageBanner() {
  const { plan, usage, limits } = useSubscription()
  const navigate = useNavigate()

  const messagesLimit = limits.messages_per_day
  const messagesUsed = usage.messages_used || 0

  if (messagesLimit === null) return null

  const pct = Math.min(100, (messagesUsed / messagesLimit) * 100)
  const isNear = pct >= 80
  const isOver = messagesUsed >= messagesLimit

  return (
    <div className={`mx-4 mb-3 px-4 py-2.5 rounded-xl flex items-center justify-between ${
      isOver ? 'bg-red-500/10 border border-red-500/20' :
      isNear ? 'bg-amber-500/10 border border-amber-500/20' :
      'bg-white/[0.02] border border-white/[0.06]'
    }`}>
      <div className="flex items-center gap-2">
        <Zap size={14} className={isOver ? 'text-red-400' : isNear ? 'text-amber-400' : 'text-gray-500'} />
        <span className="text-xs text-gray-400">
          <span className={`font-bold ${isOver ? 'text-red-400' : isNear ? 'text-amber-400' : 'text-white'}`}>
            {messagesUsed}/{messagesLimit}
          </span>
          {' '}messages today
          <span className="text-gray-600 ml-1">({plan})</span>
        </span>
      </div>

      {(isNear || plan === 'free') && (
        <button
          onClick={() => navigate('/pricing')}
          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
        >
          Upgrade
        </button>
      )}
    </div>
  )
}
