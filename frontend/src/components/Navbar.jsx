import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronLeft } from 'lucide-react'

export default function Navbar({ back }) {
  const { user, signOut } = useAuth()
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
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted hidden sm:block">{user?.email}</span>
          <button onClick={handleSignOut} className="text-muted hover:text-white transition-colors" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  )
}
