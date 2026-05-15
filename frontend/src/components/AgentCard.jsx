import { motion } from 'framer-motion'

export default function AgentCard({ emoji, name, description, status, action, onAction }) {
  const isLive = status === 'LIVE'

  return (
    <motion.div
      whileHover={{ y: -4, borderColor: isLive ? '#3B82F6' : '#333' }}
      transition={{ duration: 0.2 }}
      className="bg-dark-card border border-dark-border rounded-2xl p-6 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl">{emoji}</span>
        <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
          isLive
            ? 'text-brand-green bg-brand-green/10'
            : 'text-muted bg-white/5'
        }`}>
          {isLive && <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse" />}
          {status}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1">{name}</h3>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </div>
      <button
        onClick={onAction}
        disabled={!isLive && action !== 'Notify Me'}
        className={`mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
          isLive
            ? 'bg-brand-blue hover:bg-blue-600 text-white glow-blue'
            : action === 'Notify Me'
              ? 'bg-white/5 hover:bg-white/10 text-muted hover:text-white border border-dark-border'
              : 'bg-white/5 text-muted/50 cursor-not-allowed border border-dark-border'
        }`}
      >
        {isLive ? 'Launch' : action || 'Coming Soon'}
      </button>
    </motion.div>
  )
}
