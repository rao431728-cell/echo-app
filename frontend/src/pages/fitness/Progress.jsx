import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { getProfile, logWeight } from '../../lib/api'
import Navbar from '../../components/Navbar'
import BottomNav from '../../components/BottomNav'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Loader2, Plus, Trophy, Flame, Zap, Target } from 'lucide-react'

const badges = [
  { id: 'first_workout', icon: Target, label: 'First Workout', desc: 'Completed your first workout', check: d => d.totalWorkouts >= 1 },
  { id: 'streak_7', icon: Flame, label: '7 Day Streak', desc: 'Worked out 7 days straight', check: d => d.maxStreak >= 7 },
  { id: 'streak_30', icon: Trophy, label: '30 Day Streak', desc: 'Worked out 30 days straight', check: d => d.maxStreak >= 30 },
  { id: 'fifty_workouts', icon: Zap, label: '50 Workouts', desc: 'Completed 50 total workouts', check: d => d.totalWorkouts >= 50 },
]

function ContributionGraph({ workouts }) {
  const today = new Date()
  const weeks = 12
  const days = weeks * 7
  const cells = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const hasWorkout = workouts.some(w => w.date === key)
    cells.push({ date: key, active: hasWorkout, day: d.getDay() })
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
                  cell.active ? 'bg-brand-green' : 'bg-dark-border'
                }`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Progress() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weightInput, setWeightInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then(d => {
      setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  const handleLogWeight = async () => {
    if (!weightInput) return
    setSaving(true)
    try {
      await logWeight({ user_id: user.id, weight: parseFloat(weightInput) })
      const d = await getProfile(user.id)
      setData(d)
      setWeightInput('')
    } catch {}
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
    </div>
  )

  const weightData = (data?.weight_log || []).map(w => ({
    date: new Date(w.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    weight: w.weight,
  }))

  const weeklyData = data?.weekly_workouts || []
  const totalWorkouts = data?.total_workouts || 0
  const maxStreak = data?.max_streak || 0
  const workouts = data?.all_workouts || []
  const badgeData = { totalWorkouts, maxStreak }

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
      <Navbar back="/dashboard/fitness" />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold">Progress</h1>
        </motion.div>

        {/* Weight Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Weight Tracking</h3>
            <div className="flex gap-2">
              <input type="number" value={weightInput} onChange={e => setWeightInput(e.target.value)}
                placeholder={data?.profile?.weight_unit || 'kg'}
                className="w-20 px-3 py-1.5 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-brand-blue"
                onKeyDown={e => e.key === 'Enter' && handleLogWeight()} />
              <button onClick={handleLogWeight} disabled={saving}
                className="px-3 py-1.5 bg-brand-blue hover:bg-blue-600 text-white text-sm rounded-lg transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </div>
          {weightData.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weightData}>
                <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="weight" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted text-center py-8">Log your weight to see trends</p>
          )}
        </motion.div>

        {/* Weekly workouts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Workouts per Week</h3>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted text-center py-8">Complete workouts to see history</p>
          )}
        </motion.div>

        {/* Contribution graph */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Activity</h3>
          <ContributionGraph workouts={workouts} />
        </motion.div>

        {/* Badges */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Milestones</h3>
          <div className="grid grid-cols-2 gap-3">
            {badges.map(b => {
              const earned = b.check(badgeData)
              const Icon = b.icon
              return (
                <div key={b.id} className={`rounded-xl border p-4 transition-all ${
                  earned ? 'border-brand-green/30 bg-brand-green/5' : 'border-dark-border opacity-40'
                }`}>
                  <Icon size={24} className={earned ? 'text-brand-green mb-2' : 'text-muted mb-2'} />
                  <div className="text-sm font-semibold">{b.label}</div>
                  <div className="text-[10px] text-muted">{b.desc}</div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </main>
      <BottomNav />
    </div>
  )
}
