import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { getStudyProfile, getStudySessions, getFlashcards } from '../../lib/api'
import Navbar from '../../components/Navbar'
import StudyBottomNav from '../../components/StudyBottomNav'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Loader2, Trophy, Flame, Zap, Target, BookOpen, Layers } from 'lucide-react'

const COLORS = ['#8B5CF6', '#3B82F6', '#22C55E', '#F97316', '#EC4899', '#06B6D4', '#EAB308', '#EF4444']

const badges = [
  { id: 'first_session', icon: Target, label: 'First Session', desc: 'Completed your first study session', check: d => d.totalSessions >= 1 },
  { id: 'streak_7', icon: Flame, label: '7 Day Streak', desc: 'Studied 7 days in a row', check: d => d.streak >= 7 },
  { id: 'perfect_quiz', icon: Trophy, label: 'Perfect Score', desc: 'Got 100% on a quiz', check: d => d.hasPerfect },
  { id: 'fifty_cards', icon: Layers, label: '50 Cards', desc: 'Created 50 flashcards', check: d => d.totalCards >= 50 },
  { id: 'streak_30', icon: Zap, label: '30 Day Streak', desc: 'Studied 30 days straight', check: d => d.streak >= 30 },
  { id: 'twenty_sessions', icon: BookOpen, label: '20 Sessions', desc: 'Completed 20 study sessions', check: d => d.totalSessions >= 20 },
]

function ContributionGraph({ sessions }) {
  const today = new Date()
  const weeks = 12
  const days = weeks * 7
  const cells = []

  const sessionDates = new Set(
    sessions.map(s => s.created_at?.slice(0, 10)).filter(Boolean)
  )

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    cells.push({ date: key, active: sessionDates.has(key), day: d.getDay() })
  }

  const grid = Array.from({ length: 7 }, () => [])
  cells.forEach((c, i) => grid[i % 7].push(c))

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-[3px]" style={{ gridTemplateRows: 'repeat(7, 1fr)' }}>
        {grid.map((row, ri) => (
          <div key={ri} className="flex gap-[3px]">
            {row.map((cell) => (
              <div key={cell.date} title={cell.date}
                className={`w-3 h-3 rounded-sm transition-colors ${
                  cell.active ? 'bg-brand-purple' : 'bg-dark-border'
                }`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StudyProgress() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [sessions, setSessions] = useState([])
  const [flashcardData, setFlashcardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getStudyProfile(user.id),
      getStudySessions(user.id),
      getFlashcards(user.id),
    ]).then(([profile, sess, fc]) => {
      setData(profile)
      setSessions(sess.sessions || [])
      setFlashcardData(fc)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
    </div>
  )

  const totalSessions = data?.total_sessions || 0
  const streak = data?.streak || 0
  const totalCards = flashcardData?.flashcards?.length || 0
  const quizSessions = sessions.filter(s => s.session_type === 'quiz')
  const hasPerfect = quizSessions.some(s => s.score === s.total_questions && s.total_questions > 0)
  const badgeData = { totalSessions, streak, hasPerfect, totalCards }

  // Subject breakdown
  const subjectCounts = {}
  sessions.forEach(s => {
    if (s.subject) subjectCounts[s.subject] = (subjectCounts[s.subject] || 0) + 1
  })
  const subjectData = Object.entries(subjectCounts).map(([name, value]) => ({ name, value }))

  // Quiz scores over time
  const quizScores = quizSessions
    .filter(s => s.score != null && s.total_questions)
    .slice(-20)
    .map(s => ({
      date: new Date(s.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      score: Math.round((s.score / s.total_questions) * 100),
    }))

  // Weekly study time
  const weeklyMap = {}
  sessions.forEach(s => {
    if (s.created_at && s.duration_minutes) {
      const week = s.created_at.slice(0, 7)
      weeklyMap[week] = (weeklyMap[week] || 0) + s.duration_minutes
    }
  })
  const weeklyData = Object.entries(weeklyMap)
    .sort()
    .slice(-8)
    .map(([week, minutes]) => ({ week, minutes }))

  // Flashcard mastery by subject
  const cardsBySubject = {}
  ;(flashcardData?.flashcards || []).forEach(c => {
    if (!c.subject) return
    if (!cardsBySubject[c.subject]) cardsBySubject[c.subject] = { total: 0, mastered: 0 }
    cardsBySubject[c.subject].total++
    if ((c.times_reviewed || 0) >= 3) cardsBySubject[c.subject].mastered++
  })

  // Strongest / weakest topics
  const topicScores = {}
  quizSessions.forEach(s => {
    if (s.topic && s.score != null && s.total_questions) {
      if (!topicScores[s.topic]) topicScores[s.topic] = { correct: 0, total: 0 }
      topicScores[s.topic].correct += s.score
      topicScores[s.topic].total += s.total_questions
    }
  })
  const topics = Object.entries(topicScores).map(([topic, d]) => ({
    topic, pct: Math.round((d.correct / d.total) * 100),
  })).sort((a, b) => b.pct - a.pct)
  const strongest = topics.slice(0, 3)
  const weakest = topics.slice(-3).reverse()

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-xs">
        <span className="font-semibold">{payload[0].value}</span>
        <span className="text-muted ml-1">{payload[0].name}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg pb-20 md:pb-8">
      <Navbar back="/dashboard/study" />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold">Study Progress 📊</h1>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-brand-purple">{totalSessions}</div>
            <div className="text-[10px] text-muted mt-1">Sessions</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-brand-orange">{streak}</div>
            <div className="text-[10px] text-muted mt-1">Day Streak</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{totalCards}</div>
            <div className="text-[10px] text-muted mt-1">Flashcards</div>
          </motion.div>
        </div>

        {/* Contribution Graph */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Study Activity</h3>
          <ContributionGraph sessions={sessions} />
        </motion.div>

        {/* Quiz Scores Chart */}
        {quizScores.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-4">Quiz Scores Over Time</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={quizScores}>
                <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Subject Breakdown */}
        {subjectData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-4">Subject Breakdown</h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={subjectData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55}>
                    {subjectData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {subjectData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs">{s.name}</span>
                    <span className="text-xs text-muted ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Weekly Study Time */}
        {weeklyData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-4">Study Time (minutes/week)</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="minutes" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Flashcard Mastery */}
        {Object.keys(cardsBySubject).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-4">Flashcard Mastery</h3>
            <div className="space-y-3">
              {Object.entries(cardsBySubject).map(([subject, d]) => {
                const pct = d.total > 0 ? Math.round((d.mastered / d.total) * 100) : 0
                return (
                  <div key={subject}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{subject}</span>
                      <span className="text-muted">{d.mastered}/{d.total} mastered</span>
                    </div>
                    <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                      <div className="h-full bg-brand-purple rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Strongest / Weakest */}
        {topics.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {strongest.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                className="bg-dark-card border border-dark-border rounded-2xl p-5">
                <h3 className="font-semibold text-sm mb-3 text-brand-green">💪 Strongest</h3>
                <div className="space-y-2">
                  {strongest.map(t => (
                    <div key={t.topic} className="text-xs">
                      <span>{t.topic}</span>
                      <span className="text-brand-green ml-2">{t.pct}%</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {weakest.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="bg-dark-card border border-dark-border rounded-2xl p-5">
                <h3 className="font-semibold text-sm mb-3 text-red-400">📚 Focus Areas</h3>
                <div className="space-y-2">
                  {weakest.map(t => (
                    <div key={t.topic} className="text-xs">
                      <span>{t.topic}</span>
                      <span className="text-red-400 ml-2">{t.pct}%</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Badges */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Milestones</h3>
          <div className="grid grid-cols-2 gap-3">
            {badges.map(b => {
              const earned = b.check(badgeData)
              const Icon = b.icon
              return (
                <div key={b.id} className={`rounded-xl border p-4 transition-all ${
                  earned ? 'border-brand-purple/30 bg-brand-purple/5' : 'border-dark-border opacity-40'
                }`}>
                  <Icon size={24} className={earned ? 'text-brand-purple mb-2' : 'text-muted mb-2'} />
                  <div className="text-sm font-semibold">{b.label}</div>
                  <div className="text-[10px] text-muted">{b.desc}</div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </main>
      <StudyBottomNav />
    </div>
  )
}
