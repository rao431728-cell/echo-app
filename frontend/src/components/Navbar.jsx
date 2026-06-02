import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronLeft, Zap } from 'lucide-react'

const PLAN_COLORS = {
  free: 'bg-gray-600/20 text-gray-400',
  starter: 'bg-blue-600/20 text-blue-400',
  pro: 'bg-purple-600/20 text-purple-400',
  unlimited: 'bg-amber-600/20 text-amber-400',
}

export default function Navbar({ back }) {
  const { user, signOut } = useAuth()
  const { plan } = useSubscription()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-xl border-b border-dark-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {back && (
            <button onClick={() => navigate(back)} className="text-muted hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
          )}
          <button onClick={() => navigate('/dashboard')} className="text-xl font-bold tracking-tight">
            <span className="text-brand-blue">Echo</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/pricing')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${PLAN_COLORS[plan] || PLAN_COLORS.free}`}
          >
            {plan === 'free' ? (
              <span className="flex items-center gap-1"><Zap size={10} /> Upgrade</span>
            ) : plan}
          </button>
          <span className="text-sm text-muted hidden sm:block">{user?.email}</span>
          <button onClick={handleSignOut} className="text-muted hover:text-white transition-colors" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  )
}
