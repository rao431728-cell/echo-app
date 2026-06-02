import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { getProfile, logSteps } from '../../lib/api'
import Navbar from '../../components/Navbar'
import BottomNav from '../../components/BottomNav'
import { Flame, MessageCircle, Apple, TrendingUp, Calendar, Dumbbell, Loader2, Footprints } from 'lucide-react'

export default function FitnessHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stepsInput, setStepsInput] = useState('')
  const [savingSteps, setSavingSteps] = useState(false)

  useEffect(() => {
    if (!user) return
    getProfile(user.id)
      .then(data => {
        if (!data.profile) {
          navigate('/dashboard/fitness/onboarding')
        } else {
          setProfile(data)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Profile fetch failed:', err)
        setLoading(false)
      })
  }, [user, navigate])

  const handleLogSteps = async () => {
    if (!stepsInput || !user) return
    setSavingSteps(true)
    try {
      await logSteps({ user_id: user.id, steps: parseInt(stepsInput) })
      const data = await getProfile(user.id)
      setProfile(data)
      setStepsInput('')
    } catch (e) {
      console.error('Failed to log steps:', e)
    }
    setSavingSteps(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
    </div>
  )

  const p = profile?.profile
  const todayWorkout = profile?.today_workout
  const streak = p?.streak || 0
  const workoutsThisWeek = profile?.workouts_this_week || 0
  const daysPerWeek = p?.days_per_week || 4

  const todaySteps = profile?.today_steps
  const currentSteps = todaySteps?.steps || 0
  const stepsGoal = todaySteps?.goal || 10000

  return (
    <div className="min-h-screen bg-dark-bg pb-20 md:pb-8">
      <Navbar back="/dashboard" />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1">Hey {p?.name} 💪</h1>
          <p className="text-muted text-sm">Let's make today count.</p>
        </motion.div>

        {/* Streak + Weekly Progress */}
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
              <Calendar className="text-brand-blue" size={20} />
              <span className="text-sm text-muted font-medium">This Week</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold">{workoutsThisWeek}</span>
              <span className="text-muted text-sm mb-1">/ {daysPerWeek}</span>
            </div>
            <div className="mt-2 h-1.5 bg-dark-bg rounded-full overflow-hidden">
              <div className="h-full bg-brand-blue rounded-full transition-all"
                style={{ width: `${Math.min((workoutsThisWeek / daysPerWeek) * 100, 100)}%` }} />
            </div>
          </motion.div>
        </div>

        {/* Steps Counter */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Footprints className="text-brand-green" size={20} />
              <span className="text-sm font-medium">Steps Today</span>
            </div>
            <span className="text-xs text-muted">{stepsGoal.toLocaleString()} goal</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Circular Progress Ring */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#22c55e" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - Math.min(currentSteps / stepsGoal, 1))}`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold">{currentSteps.toLocaleString()}</span>
                <span className="text-[10px] text-muted">steps</span>
              </div>
            </div>

            {/* Quick Add */}
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={stepsInput}
                  onChange={e => setStepsInput(e.target.value)}
                  placeholder="Add steps"
                  className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-brand-green"
                  onKeyDown={e => e.key === 'Enter' && handleLogSteps()}
                />
              </div>
              <button onClick={handleLogSteps} disabled={savingSteps || !stepsInput}
                className="w-full py-2 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green text-sm font-medium rounded-lg transition-colors disabled:opacity-40">
                {savingSteps ? 'Saving...' : 'Log Steps'}
              </button>
              <div className="flex justify-between text-[10px] text-muted">
                <span>{Math.round((currentSteps / stepsGoal) * 100)}% of goal</span>
                <span>{Math.max(stepsGoal - currentSteps, 0).toLocaleString()} to go</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Today's Workout */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          onClick={() => navigate('/dashboard/fitness/workout')}
          className="bg-dark-card border border-dark-border rounded-2xl p-6 cursor-pointer hover:border-brand-blue/50 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                <Dumbbell className="text-brand-blue" size={20} />
              </div>
              <div>
                <h3 className="font-semibold">Today's Workout</h3>
                <p className="text-sm text-muted">{todayWorkout?.name || 'Rest Day'}</p>
              </div>
            </div>
            {todayWorkout && (
              <span className="text-xs text-muted">{todayWorkout?.exercises?.length || 0} exercises</span>
            )}
          </div>
          {todayWorkout ? (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {todayWorkout.exercises?.slice(0, 4).map((ex, i) => (
                  <span key={i} className="text-xs bg-dark-bg px-3 py-1 rounded-full text-muted">{ex.name}</span>
                ))}
                {(todayWorkout.exercises?.length || 0) > 4 && (
                  <span className="text-xs bg-dark-bg px-3 py-1 rounded-full text-muted">
                    +{todayWorkout.exercises.length - 4} more
                  </span>
                )}
              </div>
              <button className="w-full py-3 bg-brand-blue hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors group-hover:glow-blue">
                Start Workout
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">Rest up. You've earned it.</p>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="text-sm font-semibold text-muted mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: MessageCircle, label: 'Chat with Trainer', path: '/dashboard/fitness/chat', color: 'text-brand-blue' },
              { icon: Apple, label: 'Nutrition', path: '/dashboard/fitness/nutrition', color: 'text-brand-green' },
              { icon: TrendingUp, label: 'Progress', path: '/dashboard/fitness/progress', color: 'text-brand-orange' },
              { icon: Calendar, label: 'Full Program', path: '/dashboard/fitness/program', color: 'text-purple-400' },
            ].map(({ icon: Icon, label, path, color }) => (
              <button key={label} onClick={() => navigate(path)}
                className="bg-dark-card border border-dark-border rounded-xl p-4 text-left hover:border-muted transition-colors">
                <Icon className={color} size={20} />
                <span className="block text-sm font-medium mt-2">{label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </main>
      <BottomNav />
    </div>
  )
}
