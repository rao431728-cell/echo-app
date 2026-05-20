import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import AgentCard from '../components/AgentCard'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const agents = [
  { emoji: '💪', name: 'Fitness Agent', description: 'AI personal trainer, meal scanner, workout tracker', status: 'LIVE', path: '/dashboard/fitness' },
  { emoji: '📚', name: 'Study Agent', description: 'AI tutor, flashcards, exam prep', status: 'LIVE', path: '/dashboard/study' },
  { emoji: '💰', name: 'Finance Agent', description: 'Expense tracking, budgeting, financial advice', status: 'COMING SOON' },
  { emoji: '💼', name: 'Business Agent', description: 'Strategy, marketing, operations advisor', status: 'COMING SOON' },
  { emoji: '🔬', name: 'Research Agent', description: 'Deep research with live web search', status: 'COMING SOON' },
  { emoji: '🌐', name: 'Echo Websites', description: 'AI website builder — 6 agents, 60 seconds', status: 'LIVE', path: '/dashboard/websites' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const firstName = user?.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-1">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-muted mb-8">Your AI agents are ready.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <AgentCard
                {...a}
                onAction={() => {
                  if (a.path) navigate(a.path)
                }}
              />
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  )
}
