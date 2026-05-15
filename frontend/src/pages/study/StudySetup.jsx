import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { saveStudySetup } from '../../lib/api'
import { Loader2 } from 'lucide-react'

const allSubjects = [
  'Maths', 'Physics', 'Chemistry', 'Biology', 'Economics', 'History',
  'Geography', 'English', 'Computer Science', 'Psychology', 'Business', 'Law',
]

const levels = ['GCSE', 'A-Level', 'IB', 'University', 'Professional', 'Other']
const boards = ['AQA', 'Edexcel', 'OCR', 'CAIE', 'WJEC', 'Not applicable']

export default function StudySetup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    subjects: [],
    education_level: '',
    exam_board: '',
    custom_subject: '',
  })

  const toggleSubject = (s) => {
    setForm(p => ({
      ...p,
      subjects: p.subjects.includes(s)
        ? p.subjects.filter(x => x !== s)
        : [...p.subjects, s],
    }))
  }

  const addCustomSubject = () => {
    const s = form.custom_subject.trim()
    if (s && !form.subjects.includes(s)) {
      setForm(p => ({ ...p, subjects: [...p.subjects, s], custom_subject: '' }))
    }
  }

  const canNext = () => {
    if (step === 0) return form.subjects.length > 0
    if (step === 1) return form.education_level !== ''
    if (step === 2) return form.exam_board !== ''
    return false
  }

  const handleFinish = async () => {
    setLoading(true)
    setError('')
    try {
      await saveStudySetup({
        user_id: user.id,
        subjects: form.subjects,
        education_level: form.education_level,
        exam_board: form.exam_board,
      })
      navigate('/dashboard/study')
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const next = () => {
    if (step === 2) handleFinish()
    else setStep(s => s + 1)
  }

  const slideVariants = {
    enter: { x: 60, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -60, opacity: 0 },
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <div className="w-full max-w-lg mx-auto px-4 pt-8">
        <div className="h-1.5 bg-dark-card rounded-full overflow-hidden mb-2">
          <motion.div
            className="h-full bg-brand-purple rounded-full"
            animate={{ width: `${((step + 1) / 3) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-muted text-right">{step + 1} / 3</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="subjects" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="text-2xl font-bold mb-2">What are you studying? 📚</h2>
                <p className="text-muted text-sm mb-6">Select all that apply</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {allSubjects.map(s => (
                    <button key={s} onClick={() => toggleSubject(s)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        form.subjects.includes(s)
                          ? 'bg-brand-purple text-white'
                          : 'bg-dark-card border border-dark-border text-muted hover:border-muted'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={form.custom_subject}
                    onChange={e => setForm(p => ({ ...p, custom_subject: e.target.value }))}
                    placeholder="Add custom subject..."
                    className="flex-1 px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white text-sm placeholder-muted focus:outline-none focus:border-brand-purple transition-colors"
                    onKeyDown={e => e.key === 'Enter' && addCustomSubject()}
                  />
                  <button onClick={addCustomSubject}
                    className="px-4 py-3 bg-brand-purple/20 text-brand-purple rounded-xl text-sm font-semibold hover:bg-brand-purple/30 transition-colors">
                    Add
                  </button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="level" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="text-2xl font-bold mb-2">What level? 🎓</h2>
                <p className="text-muted text-sm mb-6">This helps us tailor questions to your level</p>
                <div className="space-y-3">
                  {levels.map(l => (
                    <button key={l} onClick={() => setForm(p => ({ ...p, education_level: l }))}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        form.education_level === l
                          ? 'border-brand-purple bg-brand-purple/10'
                          : 'border-dark-border bg-dark-card hover:border-muted'
                      }`}>
                      <span className="font-semibold">{l}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="board" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="text-2xl font-bold mb-2">Which exam board? 📝</h2>
                <p className="text-muted text-sm mb-6">We'll tailor content to your specification</p>
                <div className="space-y-3">
                  {boards.map(b => (
                    <button key={b} onClick={() => setForm(p => ({ ...p, exam_board: b }))}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        form.exam_board === b
                          ? 'border-brand-purple bg-brand-purple/10'
                          : 'border-dark-border bg-dark-card hover:border-muted'
                      }`}>
                      <span className="font-semibold">{b}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mt-4">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-colors border border-dark-border">
                Back
              </button>
            )}
            <button onClick={next} disabled={!canNext() || loading}
              className="flex-1 py-3 bg-brand-purple hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {step === 2 ? "Let's Go" : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
