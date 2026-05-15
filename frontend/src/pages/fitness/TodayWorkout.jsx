import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { getProfile, completeWorkout, explainExercise } from '../../lib/api'
import Navbar from '../../components/Navbar'
import BottomNav from '../../components/BottomNav'
import { Check, Clock, Info, Star, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

function RestTimer({ seconds, onDone }) {
  const [left, setLeft] = useState(seconds)
  const radius = 40
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    if (left <= 0) { onDone(); return }
    const t = setTimeout(() => setLeft(l => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left, onDone])

  const progress = left / seconds
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center">
        <svg width="120" height="120" className="mx-auto mb-4">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#1a1a1a" strokeWidth="6" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#3B82F6" strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round" transform="rotate(-90 60 60)" className="transition-all duration-1000" />
        </svg>
        <div className="text-4xl font-bold mb-2">{left}s</div>
        <p className="text-muted text-sm">Rest time</p>
        <button onClick={onDone} className="mt-4 px-6 py-2 text-sm text-muted hover:text-white border border-dark-border rounded-xl transition-colors">
          Skip
        </button>
      </div>
    </motion.div>
  )
}

function Confetti() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const colors = ['#3B82F6', '#F97316', '#22C55E', '#8B5CF6', '#EF4444', '#F59E0B']
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: Math.random() * 3 + 2,
      vx: (Math.random() - 0.5) * 2,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 10,
    }))
    let frame
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      particles.forEach(p => {
        p.y += p.vy
        p.x += p.vx
        p.rot += p.vr
        p.vy += 0.05
        if (p.y < canvas.height + 20) alive = true
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })
      if (alive) frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [])
  return <canvas ref={canvasRef} className="fixed inset-0 z-50 pointer-events-none" />
}

function ExplainModal({ exercise, userId, onClose }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    explainExercise({ exercise_name: exercise, user_id: userId })
      .then(data => { setText(data.explanation); setLoading(false) })
      .catch(() => { setText('Could not load explanation.'); setLoading(false) })
  }, [exercise, userId])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ y: 40 }} animate={{ y: 0 }}
        className="bg-dark-card border border-dark-border rounded-2xl p-6 max-w-md w-full max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{exercise}</h3>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-brand-blue animate-spin" /></div>
        ) : (
          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{text}</div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function TodayWorkout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState(null)
  const [completed, setCompleted] = useState({})
  const [loading, setLoading] = useState(true)
  const [restTimer, setRestTimer] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(0)
  const [explainEx, setExplainEx] = useState(null)
  const [expandedSection, setExpandedSection] = useState('main')

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then(data => {
      setWorkout(data.today_workout)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  const allExercises = workout ? [
    ...(workout.warmup || []).map(e => ({ ...e, section: 'warmup' })),
    ...(workout.exercises || []).map(e => ({ ...e, section: 'main' })),
    ...(workout.cooldown || []).map(e => ({ ...e, section: 'cooldown' })),
  ] : []

  const totalCount = allExercises.length
  const doneCount = Object.keys(completed).length
  const allDone = totalCount > 0 && doneCount === totalCount

  const toggleExercise = useCallback((idx, restTime) => {
    setCompleted(prev => {
      if (prev[idx]) {
        const next = { ...prev }
        delete next[idx]
        return next
      }
      if (restTime && !prev[idx]) setRestTimer(restTime)
      return { ...prev, [idx]: true }
    })
  }, [])

  useEffect(() => {
    if (allDone && totalCount > 0) {
      setShowConfetti(true)
      setTimeout(() => setShowRating(true), 1500)
      setTimeout(() => setShowConfetti(false), 4000)
    }
  }, [allDone, totalCount])

  const handleRate = async (stars) => {
    setRating(stars)
    try {
      await completeWorkout({ user_id: user.id, workout, rating: stars })
    } catch {}
    setTimeout(() => navigate('/dashboard/fitness'), 1000)
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
    </div>
  )

  if (!workout) return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar back="/dashboard/fitness" />
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="text-5xl mb-4">😴</div>
        <h2 className="text-xl font-bold mb-2">Rest Day</h2>
        <p className="text-muted">Recovery is where the gains happen. Take it easy today.</p>
      </div>
      <BottomNav />
    </div>
  )

  const sections = [
    { key: 'warmup', label: 'Warm Up', items: workout.warmup || [] },
    { key: 'main', label: 'Main Workout', items: workout.exercises || [] },
    { key: 'cooldown', label: 'Cool Down', items: workout.cooldown || [] },
  ]

  let globalIdx = 0

  return (
    <div className="min-h-screen bg-dark-bg pb-20 md:pb-8">
      <Navbar back="/dashboard/fitness" />
      {showConfetti && <Confetti />}
      {restTimer && <RestTimer seconds={restTimer} onDone={() => setRestTimer(null)} />}

      <AnimatePresence>
        {explainEx && <ExplainModal exercise={explainEx} userId={user.id} onClose={() => setExplainEx(null)} />}
      </AnimatePresence>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold mb-1">{workout.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span>{totalCount} exercises</span>
            <span>{doneCount}/{totalCount} completed</span>
          </div>
          <div className="mt-3 h-2 bg-dark-card rounded-full overflow-hidden">
            <motion.div className="h-full bg-brand-blue rounded-full" animate={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }} />
          </div>
        </motion.div>

        {sections.map(section => {
          if (section.items.length === 0) return null
          const sectionStart = globalIdx
          const rendered = section.items.map((ex, i) => {
            const idx = sectionStart + i
            const done = !!completed[idx]
            return (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`bg-dark-card border rounded-xl p-4 transition-all ${done ? 'border-brand-green/30 bg-brand-green/5' : 'border-dark-border'}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleExercise(idx, ex.rest)}
                    className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${done ? 'bg-brand-green border-brand-green' : 'border-muted hover:border-white'}`}>
                    {done && <Check size={14} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold text-sm ${done ? 'line-through text-muted' : ''}`}>{ex.name}</span>
                      <button onClick={() => setExplainEx(ex.name)} className="text-muted hover:text-brand-blue transition-colors">
                        <Info size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                      {ex.sets && <span>{ex.sets} sets</span>}
                      {ex.reps && <span>{ex.reps} reps</span>}
                      {ex.duration && <span>{ex.duration}</span>}
                      {ex.rest && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} />{ex.rest}s rest
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
          globalIdx += section.items.length
          const isExpanded = expandedSection === section.key

          return (
            <div key={section.key}>
              <button onClick={() => setExpandedSection(isExpanded ? null : section.key)}
                className="flex items-center justify-between w-full text-sm font-semibold text-muted mb-3">
                <span>{section.label}</span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <AnimatePresence>
                {isExpanded && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">{rendered}</motion.div>}
              </AnimatePresence>
            </div>
          )
        })}
      </main>

      <AnimatePresence>
        {showRating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="bg-dark-card border border-dark-border rounded-2xl p-8 text-center max-w-sm w-full">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">Workout Complete!</h2>
              <p className="text-muted mb-6">How was your workout?</p>
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => handleRate(s)}
                    className={`transition-all ${s <= rating ? 'text-yellow-400 scale-110' : 'text-muted hover:text-yellow-400'}`}>
                    <Star size={32} fill={s <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <BottomNav />
    </div>
  )
}
