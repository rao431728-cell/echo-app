import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { generateMCQs, completeStudySession, getStudyProfile } from '../../lib/api'
import Navbar from '../../components/Navbar'
import StudyBottomNav from '../../components/StudyBottomNav'
import { Loader2, CheckCircle2, XCircle, RotateCcw, ArrowRight, Trophy } from 'lucide-react'

export default function MCQQuiz() {
  const { user } = useAuth()
  const [phase, setPhase] = useState('setup')
  const [profile, setProfile] = useState(null)
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(10)
  const [difficulty, setDifficulty] = useState('Mixed')
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(false)
  const startTime = useRef(null)

  useEffect(() => {
    if (!user) return
    getStudyProfile(user.id).then(d => setProfile(d.profile)).catch(() => {})
  }, [user])

  const startQuiz = async () => {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await generateMCQs({
        user_id: user.id,
        topic,
        subject,
        count,
        difficulty,
      })
      setQuestions(res.mcqs || [])
      setCurrentQ(0)
      setAnswers([])
      setSelected(null)
      setSubmitted(false)
      startTime.current = Date.now()
      setPhase('quiz')
    } catch {
      alert('Failed to generate quiz. Try again.')
    }
    setLoading(false)
  }

  const submitAnswer = () => {
    if (selected === null) return
    const q = questions[currentQ]
    setAnswers(prev => [...prev, { question: currentQ, selected, correct: q.answer, isCorrect: selected === q.answer }])
    setSubmitted(true)
  }

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(i => i + 1)
      setSelected(null)
      setSubmitted(false)
    } else {
      finishQuiz()
    }
  }

  const finishQuiz = async () => {
    const score = answers.filter(a => a.isCorrect).length + (selected === questions[currentQ]?.answer ? 1 : 0)
    const finalAnswers = [...answers]
    if (submitted) {
      // last answer already in answers
    }
    const duration = Math.round((Date.now() - startTime.current) / 60000)

    try {
      await completeStudySession({
        user_id: user.id,
        subject,
        topic,
        session_type: 'quiz',
        score,
        total_questions: questions.length,
        duration_minutes: duration || 1,
      })
    } catch {}

    setPhase('results')
  }

  const finalScore = answers.filter(a => a.isCorrect).length
  const duration = startTime.current ? Math.round((Date.now() - startTime.current) / 60000) : 0

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-dark-bg pb-20 md:pb-8">
        <Navbar back="/dashboard/study" />
        <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-xl font-bold mb-1">MCQ Quiz ❓</h1>
            <p className="text-muted text-sm">Test your knowledge with AI-generated questions</p>
          </motion.div>

          <div className="space-y-4">
            {profile?.subjects?.length > 0 && (
              <div>
                <label className="text-sm text-muted font-medium block mb-2">Subject</label>
                <select value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:border-brand-purple transition-colors">
                  <option value="">Select subject...</option>
                  {profile.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm text-muted font-medium block mb-2">Topic</label>
              <input value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis, World War 2, Calculus"
                className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white text-sm placeholder-muted focus:outline-none focus:border-brand-purple transition-colors" />
            </div>

            <div>
              <label className="text-sm text-muted font-medium block mb-2">Number of Questions</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                      count === n ? 'bg-brand-purple text-white' : 'bg-dark-card border border-dark-border text-muted hover:border-muted'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-muted font-medium block mb-2">Difficulty</label>
              <div className="flex gap-2">
                {['Easy', 'Medium', 'Hard', 'Mixed'].map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                      difficulty === d ? 'bg-brand-purple text-white' : 'bg-dark-card border border-dark-border text-muted hover:border-muted'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={startQuiz} disabled={loading || !topic.trim()}
              className="w-full py-4 bg-brand-purple hover:bg-purple-600 disabled:opacity-30 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-base">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'Generating Quiz...' : 'Start Quiz'}
            </button>
          </div>
        </main>
        <StudyBottomNav />
      </div>
    )
  }

  if (phase === 'quiz' && questions.length > 0) {
    const q = questions[currentQ]
    return (
      <div className="min-h-screen bg-dark-bg pb-20 md:pb-8">
        <Navbar back="/dashboard/study" />
        <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Progress */}
          <div>
            <div className="flex justify-between text-xs text-muted mb-2">
              <span>Question {currentQ + 1} of {questions.length}</span>
              <span>{subject}</span>
            </div>
            <div className="h-2 bg-dark-card rounded-full overflow-hidden">
              <motion.div className="h-full bg-brand-purple rounded-full"
                animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.3 }} />
            </div>
          </div>

          {/* Question */}
          <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <p className="text-base font-medium leading-relaxed">{q.question}</p>
          </motion.div>

          {/* Options */}
          <div className="space-y-3">
            {Object.entries(q.options || {}).map(([letter, text]) => {
              let style = 'border-dark-border bg-dark-card hover:border-muted'
              if (submitted) {
                if (letter === q.answer) style = 'border-brand-green bg-brand-green/10'
                else if (letter === selected) style = 'border-red-500 bg-red-500/10'
                else style = 'border-dark-border bg-dark-card opacity-50'
              } else if (selected === letter) {
                style = 'border-brand-purple bg-brand-purple/10'
              }

              return (
                <motion.button key={letter}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * (letter.charCodeAt(0) - 65) }}
                  onClick={() => !submitted && setSelected(letter)}
                  disabled={submitted}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${style}`}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    submitted && letter === q.answer ? 'bg-brand-green text-white' :
                    submitted && letter === selected ? 'bg-red-500 text-white' :
                    selected === letter ? 'bg-brand-purple text-white' :
                    'bg-dark-bg text-muted'
                  }`}>
                    {submitted && letter === q.answer ? <CheckCircle2 size={16} /> :
                     submitted && letter === selected ? <XCircle size={16} /> : letter}
                  </span>
                  <span className="text-sm leading-relaxed pt-1">{text}</span>
                </motion.button>
              )
            })}
          </div>

          {/* Explanation */}
          {submitted && q.explanation && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-brand-purple/5 border border-brand-purple/20 rounded-xl p-4">
              <div className="text-xs font-semibold text-brand-purple mb-1">Explanation</div>
              <p className="text-sm text-gray-300 leading-relaxed">{q.explanation}</p>
            </motion.div>
          )}

          {/* Actions */}
          {!submitted ? (
            <button onClick={submitAnswer} disabled={selected === null}
              className="w-full py-4 bg-brand-purple hover:bg-purple-600 disabled:opacity-30 text-white font-semibold rounded-xl transition-colors">
              Submit Answer
            </button>
          ) : (
            <button onClick={nextQuestion}
              className="w-full py-4 bg-brand-purple hover:bg-purple-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              {currentQ < questions.length - 1 ? (
                <>Next Question <ArrowRight size={18} /></>
              ) : (
                <>See Results <Trophy size={18} /></>
              )}
            </button>
          )}
        </main>
      </div>
    )
  }

  if (phase === 'results') {
    const pct = questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0
    return (
      <div className="min-h-screen bg-dark-bg pb-20 md:pb-8">
        <Navbar back="/dashboard/study" />
        <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8">
            <div className="text-6xl mb-4">{pct >= 80 ? '🏆' : pct >= 50 ? '👏' : '💪'}</div>
            <h1 className="text-3xl font-bold mb-2">{finalScore} / {questions.length}</h1>
            <div className={`text-lg font-semibold ${pct >= 80 ? 'text-brand-green' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {pct}%
            </div>
            <p className="text-muted text-sm mt-2">
              {topic} • {duration || '<1'} min{duration !== 1 ? 's' : ''}
            </p>
          </motion.div>

          {/* Answer Review */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted">Review</h3>
            {answers.map((a, i) => {
              const q = questions[a.question]
              return (
                <div key={i} className={`bg-dark-card border rounded-xl p-4 ${a.isCorrect ? 'border-brand-green/30' : 'border-red-500/30'}`}>
                  <div className="flex items-start gap-2 mb-2">
                    {a.isCorrect ? <CheckCircle2 size={16} className="text-brand-green mt-0.5" /> : <XCircle size={16} className="text-red-400 mt-0.5" />}
                    <p className="text-sm">{q?.question}</p>
                  </div>
                  {!a.isCorrect && (
                    <div className="ml-6 text-xs text-muted">
                      Your answer: <span className="text-red-400">{a.selected}</span> • Correct: <span className="text-brand-green">{a.correct}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => { setPhase('setup'); setQuestions([]); setAnswers([]) }}
              className="flex-1 py-3 bg-dark-card border border-dark-border text-white rounded-xl font-semibold hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
              <RotateCcw size={16} /> New Quiz
            </button>
            <button onClick={() => { setCurrentQ(0); setAnswers([]); setSelected(null); setSubmitted(false); startTime.current = Date.now(); setPhase('quiz') }}
              className="flex-1 py-3 bg-brand-purple hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">
              Retake Quiz
            </button>
          </div>
        </main>
        <StudyBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
    </div>
  )
}
