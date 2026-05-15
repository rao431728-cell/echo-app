import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { getProgram, adjustProgram } from '../../lib/api'
import Navbar from '../../components/Navbar'
import BottomNav from '../../components/BottomNav'
import { Loader2, RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react'

export default function Program() {
  const { user } = useAuth()
  const [program, setProgram] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState(false)
  const [expandedWeek, setExpandedWeek] = useState(0)

  useEffect(() => {
    if (!user) return
    getProgram(user.id).then(data => {
      setProgram(data.program)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  const handleAdjust = async (direction) => {
    setAdjusting(true)
    try {
      const data = await adjustProgram({ user_id: user.id, direction })
      setProgram(data.program)
    } catch {}
    setAdjusting(false)
  }

  const handleRegenerate = async () => {
    setAdjusting(true)
    try {
      const data = await adjustProgram({ user_id: user.id, direction: 'regenerate' })
      setProgram(data.program)
    } catch {}
    setAdjusting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
    </div>
  )

  if (!program) return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar back="/dashboard/fitness" />
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <p className="text-muted">No program found. Complete onboarding first.</p>
      </div>
      <BottomNav />
    </div>
  )

  const weeks = program.weeks || []

  return (
    <div className="min-h-screen bg-dark-bg pb-20 md:pb-8">
      <Navbar back="/dashboard/fitness" />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold mb-1">{program.name || 'Your Program'}</h1>
          <p className="text-sm text-muted">{weeks.length} week program</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex gap-2">
          <button onClick={() => handleAdjust('easier')} disabled={adjusting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-dark-card border border-dark-border rounded-xl text-sm font-medium hover:border-muted transition-colors disabled:opacity-50">
            <TrendingDown size={16} /> Make Easier
          </button>
          <button onClick={() => handleAdjust('harder')} disabled={adjusting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-dark-card border border-dark-border rounded-xl text-sm font-medium hover:border-muted transition-colors disabled:opacity-50">
            <TrendingUp size={16} /> Make Harder
          </button>
          <button onClick={handleRegenerate} disabled={adjusting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-sm font-medium hover:border-muted transition-colors disabled:opacity-50">
            {adjusting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </motion.div>

        {weeks.map((week, wi) => {
          const isExpanded = expandedWeek === wi
          return (
            <motion.div key={wi} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + wi * 0.03 }}
              className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
              <button onClick={() => setExpandedWeek(isExpanded ? null : wi)}
                className="w-full flex items-center justify-between p-5 text-left">
                <div>
                  <h3 className="font-semibold">Week {wi + 1}</h3>
                  <p className="text-xs text-muted">{week.focus || ''}</p>
                </div>
                {isExpanded ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 space-y-3">
                  {(week.days || []).map((day, di) => (
                    <div key={di} className="bg-dark-bg rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-sm">{day.label || `Day ${di + 1}`}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          day.type === 'Rest' ? 'bg-muted/10 text-muted' : 'bg-brand-blue/10 text-brand-blue'
                        }`}>{day.type || 'Training'}</span>
                      </div>
                      {day.type !== 'Rest' && day.exercises && (
                        <div className="space-y-2">
                          {day.exercises.map((ex, ei) => (
                            <div key={ei} className="flex items-center justify-between text-sm">
                              <span className="text-gray-300">{ex.name}</span>
                              <span className="text-xs text-muted">
                                {ex.sets && `${ex.sets}×`}{ex.reps || ex.duration || ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </main>
      <BottomNav />
    </div>
  )
}
