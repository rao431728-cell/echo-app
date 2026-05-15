import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { saveOnboarding } from '../../lib/api'
import { Loader2 } from 'lucide-react'

const goals = [
  { id: 'lose_weight', emoji: '🔥', label: 'Lose Weight' },
  { id: 'build_muscle', emoji: '💪', label: 'Build Muscle' },
  { id: 'get_fit', emoji: '🏃', label: 'Get Fit' },
  { id: 'stay_active', emoji: '🧘', label: 'Stay Active' },
]

const equipment = [
  { id: 'full_gym', label: 'Full Gym' },
  { id: 'dumbbells', label: 'Dumbbells Only' },
  { id: 'bands', label: 'Resistance Bands' },
  { id: 'none', label: 'No Equipment' },
]

const levels = ['Beginner', 'Intermediate', 'Advanced']

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', age: '', weight: '', weight_unit: 'kg',
    height: '', height_unit: 'cm', goal: '', equipment: [],
    days_per_week: 3, fitness_level: '', injuries: '',
  })

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))
  const totalSteps = 10

  const toggleEquipment = (id) => {
    setForm(p => ({
      ...p,
      equipment: p.equipment.includes(id)
        ? p.equipment.filter(e => e !== id)
        : [...p.equipment, id],
    }))
  }

  const canNext = () => {
    switch (step) {
      case 0: return form.name.trim().length > 0
      case 1: return form.age > 0
      case 2: return form.weight > 0
      case 3: return form.height > 0
      case 4: return form.goal !== ''
      case 5: return form.equipment.length > 0
      case 6: return true
      case 7: return form.fitness_level !== ''
      case 8: return true
      default: return false
    }
  }

  const handleFinish = async () => {
    setStep(9)
    setLoading(true)
    setError('')
    try {
      await saveOnboarding({ user_id: user.id, ...form })
      navigate('/dashboard/fitness')
    } catch (err) {
      setLoading(false)
      setError(err.message || 'Failed to build program. Please try again.')
      setStep(8)
    }
  }

  const next = () => {
    if (step === 8) {
      handleFinish()
    } else if (step < 9) {
      setStep(s => s + 1)
    }
  }

  const slideVariants = {
    enter: { x: 60, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -60, opacity: 0 },
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <StepWrap key="name" title="What's your name?">
            <input autoFocus value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-4 py-4 bg-dark-bg border border-dark-border rounded-xl text-white text-lg focus:outline-none focus:border-brand-blue transition-colors"
              placeholder="Your first name" onKeyDown={e => e.key === 'Enter' && canNext() && next()} />
          </StepWrap>
        )
      case 1:
        return (
          <StepWrap key="age" title="How old are you?">
            <input autoFocus type="number" value={form.age} onChange={e => set('age', e.target.value)}
              className="w-full px-4 py-4 bg-dark-bg border border-dark-border rounded-xl text-white text-lg focus:outline-none focus:border-brand-blue transition-colors"
              placeholder="25" onKeyDown={e => e.key === 'Enter' && canNext() && next()} />
          </StepWrap>
        )
      case 2:
        return (
          <StepWrap key="weight" title="What's your weight?">
            <div className="flex gap-3">
              <input autoFocus type="number" value={form.weight} onChange={e => set('weight', e.target.value)}
                className="flex-1 px-4 py-4 bg-dark-bg border border-dark-border rounded-xl text-white text-lg focus:outline-none focus:border-brand-blue transition-colors"
                placeholder={form.weight_unit === 'kg' ? '70' : '154'}
                onKeyDown={e => e.key === 'Enter' && canNext() && next()} />
              <div className="flex rounded-xl overflow-hidden border border-dark-border">
                {['kg', 'lbs'].map(u => (
                  <button key={u} onClick={() => set('weight_unit', u)}
                    className={`px-4 py-4 text-sm font-semibold transition-colors ${form.weight_unit === u ? 'bg-brand-blue text-white' : 'bg-dark-bg text-muted'}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </StepWrap>
        )
      case 3:
        return (
          <StepWrap key="height" title="What's your height?">
            <div className="flex gap-3">
              <input autoFocus type="number" value={form.height} onChange={e => set('height', e.target.value)}
                className="flex-1 px-4 py-4 bg-dark-bg border border-dark-border rounded-xl text-white text-lg focus:outline-none focus:border-brand-blue transition-colors"
                placeholder={form.height_unit === 'cm' ? '175' : '5.9'}
                onKeyDown={e => e.key === 'Enter' && canNext() && next()} />
              <div className="flex rounded-xl overflow-hidden border border-dark-border">
                {['cm', 'ft'].map(u => (
                  <button key={u} onClick={() => set('height_unit', u)}
                    className={`px-4 py-4 text-sm font-semibold transition-colors ${form.height_unit === u ? 'bg-brand-blue text-white' : 'bg-dark-bg text-muted'}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </StepWrap>
        )
      case 4:
        return (
          <StepWrap key="goal" title="What's your main goal?">
            <div className="grid grid-cols-2 gap-3">
              {goals.map(g => (
                <button key={g.id} onClick={() => set('goal', g.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${form.goal === g.id ? 'border-brand-blue bg-brand-blue/10' : 'border-dark-border bg-dark-bg hover:border-muted'}`}>
                  <span className="text-2xl block mb-2">{g.emoji}</span>
                  <span className="font-semibold text-sm">{g.label}</span>
                </button>
              ))}
            </div>
          </StepWrap>
        )
      case 5:
        return (
          <StepWrap key="equip" title="What equipment do you have?">
            <div className="grid grid-cols-2 gap-3">
              {equipment.map(eq => (
                <button key={eq.id} onClick={() => toggleEquipment(eq.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${form.equipment.includes(eq.id) ? 'border-brand-blue bg-brand-blue/10' : 'border-dark-border bg-dark-bg hover:border-muted'}`}>
                  <span className="font-semibold text-sm">{eq.label}</span>
                </button>
              ))}
            </div>
          </StepWrap>
        )
      case 6:
        return (
          <StepWrap key="days" title="How many days per week?">
            <div className="space-y-4">
              <div className="text-center text-5xl font-bold text-brand-blue">{form.days_per_week}</div>
              <input type="range" min={1} max={6} value={form.days_per_week}
                onChange={e => set('days_per_week', parseInt(e.target.value))}
                className="w-full accent-brand-blue" />
              <div className="flex justify-between text-sm text-muted">
                <span>1 day</span><span>6 days</span>
              </div>
            </div>
          </StepWrap>
        )
      case 7:
        return (
          <StepWrap key="level" title="What's your fitness level?">
            <div className="space-y-3">
              {levels.map(l => (
                <button key={l} onClick={() => set('fitness_level', l)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${form.fitness_level === l ? 'border-brand-blue bg-brand-blue/10' : 'border-dark-border bg-dark-bg hover:border-muted'}`}>
                  <span className="font-semibold">{l}</span>
                </button>
              ))}
            </div>
          </StepWrap>
        )
      case 8:
        return (
          <StepWrap key="injuries" title="Any injuries to avoid?">
            <textarea value={form.injuries} onChange={e => set('injuries', e.target.value)}
              className="w-full px-4 py-4 bg-dark-bg border border-dark-border rounded-xl text-white text-base focus:outline-none focus:border-brand-blue transition-colors resize-none h-32"
              placeholder="e.g. bad left knee, lower back pain (optional)" />
          </StepWrap>
        )
      case 9:
        return (
          <motion.div key="loading" variants={slideVariants} initial="enter" animate="center" exit="exit"
            className="flex flex-col items-center justify-center gap-6 py-12">
            <Loader2 className="w-12 h-12 text-brand-blue animate-spin" />
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Building your personal program...</h2>
              <p className="text-muted">Our AI is designing a program just for you</p>
            </div>
          </motion.div>
        )
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <div className="w-full max-w-lg mx-auto px-4 pt-8">
        <div className="h-1.5 bg-dark-card rounded-full overflow-hidden mb-2">
          <motion.div
            className="h-full bg-brand-blue rounded-full"
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-muted text-right">{step + 1} / {totalSteps}</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {error && step < 9 && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mt-4">
              {error}
            </div>
          )}

          {step < 9 && (
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-colors border border-dark-border">
                  Back
                </button>
              )}
              <button onClick={next} disabled={!canNext()}
                className="flex-1 py-3 bg-brand-blue hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors">
                {step === 8 ? 'Build My Program' : 'Continue'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StepWrap({ title, children }) {
  return (
    <motion.div
      variants={{ enter: { x: 60, opacity: 0 }, center: { x: 0, opacity: 1 }, exit: { x: -60, opacity: 0 } }}
      initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      {children}
    </motion.div>
  )
}
