import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { Zap, Brain, Dumbbell, BookOpen, DollarSign, Briefcase, Globe, FlaskConical } from 'lucide-react'

const subtitles = [
  'Your AI Fitness Coach.',
  'Your AI Study Partner.',
  'Your AI Business Advisor.',
]

const features = [
  { icon: Dumbbell, emoji: '💪', name: 'Fitness Agent', desc: 'AI personal trainer, meal scanner, workout tracker', live: true },
  { icon: BookOpen, emoji: '📚', name: 'Study Agent', desc: 'AI tutor, flashcards, exam prep', live: false },
  { icon: DollarSign, emoji: '💰', name: 'Finance Agent', desc: 'Expense tracking, budgeting, financial advice', live: false },
  { icon: Briefcase, emoji: '💼', name: 'Business Agent', desc: 'Strategy, marketing, operations advisor', live: false },
  { icon: FlaskConical, emoji: '🔬', name: 'Research Agent', desc: 'Deep research with live web search', live: false },
  { icon: Globe, emoji: '🌐', name: 'Echo Websites', desc: 'AI website builder — 6 agents, 60 seconds', live: false },
]

export default function Landing() {
  const [subtitleIdx, setSubtitleIdx] = useState(0)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])

  useEffect(() => {
    const t = setInterval(() => setSubtitleIdx(i => (i + 1) % subtitles.length), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen bg-dark-bg">
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-blue/10 blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-blue-500/5 blur-[80px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-sm font-medium mb-8">
            <Zap size={14} />
            Now in Beta
          </div>

          <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight mb-6">
            Meet <span className="text-brand-blue">Echo</span>
          </h1>

          <div className="h-10 mb-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={subtitleIdx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="text-xl sm:text-2xl font-semibold text-brand-blue"
              >
                {subtitles[subtitleIdx]}
              </motion.p>
            </AnimatePresence>
          </div>

          <p className="text-lg text-muted mb-10">
            One app. Every AI agent you need.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/signup')}
              className="px-8 py-3.5 bg-brand-blue hover:bg-blue-600 text-white font-semibold rounded-xl text-base transition-colors glow-blue"
            >
              Get Started Free
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl text-base border border-dark-border transition-colors"
            >
              See what's inside
            </motion.button>
          </div>
        </motion.div>
      </section>

      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">AI Agents for Everything</h2>
            <p className="text-muted text-lg">Specialized AI that actually gets things done.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4, borderColor: f.live ? '#3B82F6' : '#333' }}
                className="bg-dark-card border border-dark-border rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{f.emoji}</span>
                  {f.live ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-brand-green bg-brand-green/10 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse" />
                      LIVE
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted bg-white/5 px-2 py-1 rounded-full">COMING SOON</span>
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-1">{f.name}</h3>
                <p className="text-sm text-muted">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-dark-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-muted">&copy; {new Date().getFullYear()} Echo. All rights reserved.</span>
          <span className="font-bold text-brand-blue">Echo</span>
        </div>
      </footer>
    </div>
  )
}
