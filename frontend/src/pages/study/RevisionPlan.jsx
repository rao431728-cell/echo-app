import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { generateRevisionPlan, getStudyProfile } from '../../lib/api'
import Navbar from '../../components/Navbar'
import StudyBottomNav from '../../components/StudyBottomNav'
import { Loader2, Calendar, CheckCircle2, BookOpen, Layers, FileText, HelpCircle, Brain } from 'lucide-react'

const typeIcons = {
  notes: FileText,
  flashcards: Layers,
  past_papers: FileText,
  practice_questions: HelpCircle,
  mind_maps: Brain,
  revision: BookOpen,
}

const typeColors = {
  notes: 'text-blue-400',
  flashcards: 'text-amber-400',
  past_papers: 'text-brand-green',
  practice_questions: 'text-brand-purple',
  mind_maps: 'text-pink-400',
  revision: 'text-brand-orange',
}

export default function RevisionPlan() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [examDate, setExamDate] = useState('')
  const [hoursPerDay, setHoursPerDay] = useState(3)
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [completedDays, setCompletedDays] = useState(new Set())
  const [selectedWeek, setSelectedWeek] = useState(0)

  useEffect(() => {
    if (!user) return
    getStudyProfile(user.id).then(d => {
      setProfile(d.profile)
      if (d.profile?.subjects) setSelectedSubjects(d.profile.subjects)
      setLoadingProfile(false)
    }).catch(() => setLoadingProfile(false))
  }, [user])

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await generateRevisionPlan({
        user_id: user.id,
        subjects: selectedSubjects,
        exam_date: examDate,
        hours_per_day: hoursPerDay,
      })
      setPlan(res.plan)
      setSelectedWeek(0)
      setCompletedDays(new Set())
    } catch {
      alert('Failed to generate plan. Try again.')
    }
    setLoading(false)
  }

  const toggleDay = (weekIdx, dayIdx) => {
    const key = `${weekIdx}-${dayIdx}`
    setCompletedDays(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSubject = (s) => {
    setSelectedSubjects(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  if (loadingProfile) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-bg pb-20 md:pb-8">
      <Navbar back="/dashboard/study" />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold mb-1">Revision Plan 📅</h1>
          <p className="text-muted text-sm">AI-generated study schedule tailored to you</p>
        </motion.div>

        {!plan ? (
          <div className="space-y-4">
            {profile?.subjects?.length > 0 && (
              <div>
                <label className="text-sm text-muted font-medium block mb-2">Subjects</label>
                <div className="flex flex-wrap gap-2">
                  {profile.subjects.map(s => (
                    <button key={s} onClick={() => toggleSubject(s)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedSubjects.includes(s)
                          ? 'bg-brand-purple text-white'
                          : 'bg-dark-card border border-dark-border text-muted'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-muted font-medium block mb-2">Exam Date</label>
              <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
                className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:border-brand-purple transition-colors" />
            </div>

            <div>
              <label className="text-sm text-muted font-medium block mb-2">Hours per day: {hoursPerDay}</label>
              <input type="range" min={1} max={8} value={hoursPerDay}
                onChange={e => setHoursPerDay(parseInt(e.target.value))}
                className="w-full accent-[#8B5CF6]" />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>1 hour</span><span>8 hours</span>
              </div>
            </div>

            <button onClick={handleGenerate} disabled={loading || selectedSubjects.length === 0}
              className="w-full py-4 bg-brand-purple hover:bg-purple-600 disabled:opacity-30 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar size={18} />}
              {loading ? 'Creating your plan...' : 'Generate Revision Plan'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Week Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {(plan.weeks || []).map((w, i) => {
                const totalDays = w.days?.length || 0
                const doneDays = (w.days || []).filter((_, di) => completedDays.has(`${i}-${di}`)).length
                return (
                  <button key={i} onClick={() => setSelectedWeek(i)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedWeek === i ? 'bg-brand-purple text-white' : 'bg-dark-card border border-dark-border text-muted'
                    }`}>
                    Week {w.week_number || i + 1}
                    {totalDays > 0 && (
                      <span className="ml-2 text-xs opacity-70">{doneDays}/{totalDays}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Week Focus */}
            {plan.weeks?.[selectedWeek]?.focus && (
              <div className="bg-brand-purple/10 border border-brand-purple/20 rounded-xl p-4">
                <div className="text-xs font-semibold text-brand-purple mb-1">Focus</div>
                <p className="text-sm">{plan.weeks[selectedWeek].focus}</p>
              </div>
            )}

            {/* Days */}
            <div className="space-y-3">
              {(plan.weeks?.[selectedWeek]?.days || []).map((day, di) => {
                const isDone = completedDays.has(`${selectedWeek}-${di}`)
                return (
                  <motion.div key={di}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: di * 0.05 }}
                    className={`bg-dark-card border rounded-2xl p-4 transition-all ${
                      isDone ? 'border-brand-green/30 bg-brand-green/5' : 'border-dark-border'
                    }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-sm">{day.day}</span>
                      <button onClick={() => toggleDay(selectedWeek, di)}
                        className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                          isDone ? 'bg-brand-green/20 text-brand-green' : 'bg-dark-bg text-muted hover:text-white'
                        }`}>
                        {isDone ? '✓ Done' : 'Mark Done'}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(day.sessions || []).map((session, si) => {
                        const Icon = typeIcons[session.type] || BookOpen
                        const color = typeColors[session.type] || 'text-muted'
                        return (
                          <div key={si} className="flex items-center gap-3 py-1">
                            <Icon size={16} className={color} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm">{session.subject}</span>
                              {session.topic && <span className="text-xs text-muted ml-2">— {session.topic}</span>}
                            </div>
                            <span className="text-xs text-muted flex-shrink-0">{session.duration_minutes}min</span>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Reset */}
            <button onClick={() => setPlan(null)}
              className="w-full py-3 bg-dark-card border border-dark-border text-muted rounded-xl font-semibold hover:bg-white/5 hover:text-white transition-colors">
              Generate New Plan
            </button>
          </div>
        )}
      </main>
      <StudyBottomNav />
    </div>
  )
}
