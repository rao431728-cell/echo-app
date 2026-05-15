import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { getStudyProfile } from '../../lib/api'
import Navbar from '../../components/Navbar'
import StudyBottomNav from '../../components/StudyBottomNav'
import { Flame, MessageCircle, Layers, HelpCircle, Calendar, Upload, TrendingUp, BookOpen, Loader2 } from 'lucide-react'

export default function StudyHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getStudyProfile(user.id)
      .then(d => {
        if (!d.profile) {
          navigate('/dashboard/study/setup')
        } else {
          setData(d)
        }
        setLoading(false)
      })
      .catch(() => {
        navigate('/dashboard/study/setup')
      })
  }, [user, navigate])

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
    </div>
  )

  const profile = data?.profile
  const streak = profile?.study_streak || 0
  const totalSessions = profile?.total_sessions || 0
  const subjects = profile?.subjects || []
  const recentSessions = data?.recent_sessions || []
  const firstName = user?.email?.split('@')[0] || 'there'

  const actions = [
    { icon: MessageCircle, label: 'Chat with Tutor', path: '/dashboard/study/chat', color: 'text-brand-purple', emoji: '💬' },
    { icon: Upload, label: 'Upload Notes', path: '/dashboard/study/upload', color: 'text-blue-400', emoji: '📄' },
    { icon: Layers, label: 'Flashcards', path: '/dashboard/study/flashcards', color: 'text-amber-400', emoji: '🃏' },
    { icon: HelpCircle, label: 'MCQ Quiz', path: '/dashboard/study/quiz', color: 'text-brand-green', emoji: '❓' },
    { icon: Calendar, label: 'Revision Plan', path: '/dashboard/study/revision', color: 'text-pink-400', emoji: '📅' },
    { icon: TrendingUp, label: 'My Progress', path: '/dashboard/study/progress', color: 'text-brand-orange', emoji: '📊' },
  ]

  return (
    <div className="min-h-screen bg-dark-bg pb-20 md:pb-8">
      <Navbar back="/dashboard" />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1">Ready to study, {firstName}? 📚</h1>
          <p className="text-muted text-sm">Let's make every session count.</p>
        </motion.div>

        {/* Streak + Sessions */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="text-brand-orange" size={20} />
              <span className="text-sm text-muted font-medium">Streak</span>
            </div>
            <div className="text-3xl font-bold text-brand-orange">{streak}</div>
            <div className="text-xs text-muted mt-1">days</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="text-brand-purple" size={20} />
              <span className="text-sm text-muted font-medium">Sessions</span>
            </div>
            <div className="text-3xl font-bold text-brand-purple">{totalSessions}</div>
            <div className="text-xs text-muted mt-1">completed</div>
          </motion.div>
        </div>

        {/* Subject Quick Launch */}
        {subjects.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <h3 className="text-sm font-semibold text-muted mb-3">Your Subjects</h3>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <button key={s} onClick={() => navigate(`/dashboard/study/chat?subject=${encodeURIComponent(s)}`)}
                  className="px-4 py-2 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple rounded-full text-sm font-medium hover:bg-brand-purple/20 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="text-sm font-semibold text-muted mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {actions.map(({ icon: Icon, label, path, color, emoji }) => (
              <button key={label} onClick={() => navigate(path)}
                className="bg-dark-card border border-dark-border rounded-xl p-4 text-left hover:border-brand-purple/50 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{emoji}</span>
                  <Icon className={color} size={18} />
                </div>
                <span className="block text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="text-sm font-semibold text-muted mb-3">Recent Sessions</h3>
            <div className="space-y-2">
              {recentSessions.slice(0, 5).map((s, i) => (
                <div key={i} className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{s.subject || 'Study'}</span>
                    {s.topic && <span className="text-xs text-muted ml-2">— {s.topic}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {s.score != null && (
                      <span className="text-xs font-semibold text-brand-purple">{s.score}/{s.total_questions}</span>
                    )}
                    <span className="text-xs text-muted">{s.session_type}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
      <StudyBottomNav />
    </div>
  )
}
