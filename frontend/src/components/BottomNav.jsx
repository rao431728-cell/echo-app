import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Dumbbell, MessageCircle, Apple, TrendingUp } from 'lucide-react'

const tabs = [
  { path: '/dashboard/fitness', icon: Home, label: 'Home' },
  { path: '/dashboard/fitness/workout', icon: Dumbbell, label: 'Workout' },
  { path: '/dashboard/fitness/chat', icon: MessageCircle, label: 'Chat' },
  { path: '/dashboard/fitness/nutrition', icon: Apple, label: 'Nutrition' },
  { path: '/dashboard/fitness/progress', icon: TrendingUp, label: 'Progress' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-bg/90 backdrop-blur-xl border-t border-dark-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
                active ? 'text-brand-blue' : 'text-muted'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
