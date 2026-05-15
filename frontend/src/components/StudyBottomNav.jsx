import { useNavigate, useLocation } from 'react-router-dom'
import { Home, MessageCircle, Layers, HelpCircle, TrendingUp } from 'lucide-react'

const tabs = [
  { path: '/dashboard/study', icon: Home, label: 'Home' },
  { path: '/dashboard/study/chat', icon: MessageCircle, label: 'Tutor' },
  { path: '/dashboard/study/flashcards', icon: Layers, label: 'Cards' },
  { path: '/dashboard/study/quiz', icon: HelpCircle, label: 'Quiz' },
  { path: '/dashboard/study/progress', icon: TrendingUp, label: 'Progress' },
]

export default function StudyBottomNav() {
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
                active ? 'text-brand-purple' : 'text-muted'
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
