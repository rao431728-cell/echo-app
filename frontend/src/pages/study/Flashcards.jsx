import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { getFlashcards, reviewFlashcard, generateFlashcards, getStudyProfile } from '../../lib/api'
import Navbar from '../../components/Navbar'
import StudyBottomNav from '../../components/StudyBottomNav'
import { Loader2, RotateCcw, Plus, Layers } from 'lucide-react'

export default function Flashcards() {
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [dueCards, setDueCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [mode, setMode] = useState('browse')
  const [generating, setGenerating] = useState(false)
  const [genTopic, setGenTopic] = useState('')
  const [genSubject, setGenSubject] = useState('')
  const [profile, setProfile] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState('all')

  useEffect(() => {
    if (!user) return
    Promise.all([
      getFlashcards(user.id),
      getStudyProfile(user.id),
    ]).then(([fc, sp]) => {
      setCards(fc.flashcards || [])
      setDueCards(fc.due_today || [])
      setProfile(sp.profile)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  const activeCards = mode === 'due' ? dueCards : (
    selectedSubject === 'all' ? cards : cards.filter(c => c.subject === selectedSubject)
  )

  const currentCard = activeCards[currentIndex]

  const handleRate = async (rating) => {
    if (!currentCard) return
    await reviewFlashcard({ card_id: currentCard.id, rating })
    setFlipped(false)
    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setCurrentIndex(0)
      const fc = await getFlashcards(user.id)
      setCards(fc.flashcards || [])
      setDueCards(fc.due_today || [])
    }
  }

  const handleGenerate = async () => {
    if (!genTopic.trim()) return
    setGenerating(true)
    try {
      await generateFlashcards({
        user_id: user.id,
        topic: genTopic,
        subject: genSubject,
        count: 10,
      })
      const fc = await getFlashcards(user.id)
      setCards(fc.flashcards || [])
      setDueCards(fc.due_today || [])
      setGenTopic('')
    } catch {}
    setGenerating(false)
  }

  const subjects = [...new Set(cards.map(c => c.subject).filter(Boolean))]
  const masteredCount = cards.filter(c => (c.times_reviewed || 0) >= 3).length
  const masteryPct = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-bg pb-20 md:pb-8">
      <Navbar back="/dashboard/study" />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold mb-1">Flashcards 🃏</h1>
          <p className="text-muted text-sm">{cards.length} cards • {dueCards.length} due today • {masteryPct}% mastered</p>
        </motion.div>

        {/* Mode Tabs */}
        <div className="flex gap-2">
          <button onClick={() => { setMode('due'); setCurrentIndex(0); setFlipped(false) }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${mode === 'due' ? 'bg-brand-purple text-white' : 'bg-dark-card border border-dark-border text-muted'}`}>
            Due Today ({dueCards.length})
          </button>
          <button onClick={() => { setMode('browse'); setCurrentIndex(0); setFlipped(false) }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${mode === 'browse' ? 'bg-brand-purple text-white' : 'bg-dark-card border border-dark-border text-muted'}`}>
            All Cards
          </button>
        </div>

        {/* Subject Filter */}
        {mode === 'browse' && subjects.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setSelectedSubject('all'); setCurrentIndex(0); setFlipped(false) }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedSubject === 'all' ? 'bg-brand-purple/20 text-brand-purple' : 'bg-dark-card text-muted'}`}>
              All
            </button>
            {subjects.map(s => (
              <button key={s} onClick={() => { setSelectedSubject(s); setCurrentIndex(0); setFlipped(false) }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedSubject === s ? 'bg-brand-purple/20 text-brand-purple' : 'bg-dark-card text-muted'}`}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Card Display */}
        {activeCards.length > 0 ? (
          <div className="space-y-4">
            <div className="text-center text-xs text-muted">
              {currentIndex + 1} / {activeCards.length}
            </div>

            <motion.div
              key={`${currentCard?.id}-${flipped}`}
              initial={{ rotateY: flipped ? -90 : 0, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              onClick={() => setFlipped(!flipped)}
              className="bg-dark-card border border-dark-border rounded-2xl p-8 min-h-[250px] flex flex-col items-center justify-center cursor-pointer hover:border-brand-purple/50 transition-colors"
            >
              <div className="text-xs text-muted mb-4 uppercase tracking-wider">
                {flipped ? 'Answer' : 'Question'}
              </div>
              <div className="text-center text-lg leading-relaxed">
                {flipped ? currentCard?.answer : currentCard?.question}
              </div>
              {!flipped && (
                <div className="mt-6 flex items-center gap-2 text-xs text-muted">
                  <RotateCcw size={14} />
                  Tap to reveal
                </div>
              )}
              {currentCard?.subject && (
                <div className="mt-4 px-3 py-1 bg-brand-purple/10 text-brand-purple rounded-full text-xs">
                  {currentCard.subject}{currentCard.topic ? ` — ${currentCard.topic}` : ''}
                </div>
              )}
            </motion.div>

            {/* Rating Buttons */}
            {flipped && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex gap-3">
                <button onClick={() => handleRate('hard')}
                  className="flex-1 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-semibold text-sm hover:bg-red-500/20 transition-colors">
                  😕 Hard
                </button>
                <button onClick={() => handleRate('okay')}
                  className="flex-1 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl font-semibold text-sm hover:bg-amber-500/20 transition-colors">
                  😐 Okay
                </button>
                <button onClick={() => handleRate('easy')}
                  className="flex-1 py-3 bg-brand-green/10 border border-brand-green/20 text-brand-green rounded-xl font-semibold text-sm hover:bg-brand-green/20 transition-colors">
                  😊 Easy
                </button>
              </motion.div>
            )}

            {/* Mastery Progress */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <div className="flex justify-between text-xs text-muted mb-2">
                <span>Mastery</span>
                <span>{masteryPct}%</span>
              </div>
              <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                <div className="h-full bg-brand-purple rounded-full transition-all" style={{ width: `${masteryPct}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="font-semibold mb-2">{mode === 'due' ? 'No cards due today!' : 'No flashcards yet'}</h3>
            <p className="text-sm text-muted mb-4">
              {mode === 'due' ? 'Great job! Check back tomorrow.' : 'Generate some cards to start studying.'}
            </p>
          </div>
        )}

        {/* Generate Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Plus size={16} className="text-brand-purple" />
            Generate Flashcards
          </h3>
          <div className="space-y-3">
            {profile?.subjects?.length > 0 && (
              <select value={genSubject} onChange={e => setGenSubject(e.target.value)}
                className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:border-brand-purple transition-colors">
                <option value="">Select subject...</option>
                {profile.subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <input value={genTopic} onChange={e => setGenTopic(e.target.value)}
              placeholder="Enter topic (e.g., Quadratic equations)"
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white text-sm placeholder-muted focus:outline-none focus:border-brand-purple transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
            <button onClick={handleGenerate} disabled={generating || !genTopic.trim()}
              className="w-full py-3 bg-brand-purple hover:bg-purple-600 disabled:opacity-30 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {generating ? 'Generating...' : 'Generate 10 Cards'}
            </button>
          </div>
        </motion.div>
      </main>
      <StudyBottomNav />
    </div>
  )
}
