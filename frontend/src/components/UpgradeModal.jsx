import { motion, AnimatePresence } from 'framer-motion'
import { useSubscription } from '../contexts/SubscriptionContext'
import { X, Zap } from 'lucide-react'

export default function UpgradeModal({ show, onClose, error }) {
  const { checkout } = useSubscription()

  if (!show) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[400px] rounded-2xl p-6"
          style={{
            background: 'rgba(15, 15, 25, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="text-amber-400" size={20} />
              <h3 className="text-white font-bold text-lg">Upgrade Required</h3>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <X size={18} />
            </button>
          </div>

          <p className="text-gray-400 text-sm mb-1">
            You've reached your daily limit{error?.plan ? ` on the ${error.plan} plan` : ''}.
          </p>
          {error?.usage && error?.limits && (
            <p className="text-gray-500 text-xs mb-4">
              {error.usage.messages_used}/{error.limits.messages_per_day || '∞'} messages used today
            </p>
          )}

          <div className="space-y-2 mb-4">
            <button
              onClick={() => checkout('starter')}
              className="w-full py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Starter — $9.99/mo (50 msg/day)
            </button>
            <button
              onClick={() => checkout('pro')}
              className="w-full py-3 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
            >
              Pro — $24.99/mo (200 msg/day)
            </button>
            <button
              onClick={() => checkout('unlimited')}
              className="w-full py-3 rounded-xl text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
            >
              Unlimited — $49.99/mo
            </button>
          </div>

          <button onClick={onClose} className="w-full py-2 text-gray-500 text-sm hover:text-gray-400">
            Maybe later
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
