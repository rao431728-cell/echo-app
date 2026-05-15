import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { getProfile, scanFood, generateMeals, saveMeals } from '../../lib/api'
import Navbar from '../../components/Navbar'
import BottomNav from '../../components/BottomNav'
import { Camera, Loader2, RefreshCw, Droplets, Utensils, X, Plus } from 'lucide-react'

function calcTDEE(profile) {
  if (!profile) return { tdee: 2000, protein: 150, carbs: 200, fats: 70 }
  let w = parseFloat(profile.weight) || 70
  let h = parseFloat(profile.height) || 170
  const age = parseInt(profile.age) || 25
  if (profile.weight_unit === 'lbs') w *= 0.453592
  if (profile.height_unit === 'ft') h *= 30.48
  let bmr = 10 * w + 6.25 * h - 5 * age + 5
  const multipliers = { 1: 1.2, 2: 1.375, 3: 1.55, 4: 1.55, 5: 1.725, 6: 1.9 }
  const tdee = Math.round(bmr * (multipliers[profile.days_per_week] || 1.55))
  let adjusted = tdee
  if (profile.goal === 'lose_weight') adjusted = Math.round(tdee * 0.8)
  else if (profile.goal === 'build_muscle') adjusted = Math.round(tdee * 1.1)
  const protein = Math.round(w * 2)
  const fats = Math.round((adjusted * 0.25) / 9)
  const carbs = Math.round((adjusted - protein * 4 - fats * 9) / 4)
  return { tdee: adjusted, protein, carbs, fats }
}

function MacroRing({ label, current, target, color }) {
  const pct = Math.min((current / target) * 100, 100)
  const radius = 28
  const circ = 2 * Math.PI * radius
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="68" height="68">
        <circle cx="34" cy="34" r={radius} fill="none" stroke="#1a1a1a" strokeWidth="5" />
        <circle cx="34" cy="34" r={radius} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round" transform="rotate(-90 34 34)" className="transition-all duration-500" />
      </svg>
      <span className="text-xs font-semibold">{current}g</span>
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  )
}

function WaterTracker({ glasses, setGlasses }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Droplets className="text-blue-400" size={18} />
        <span className="text-sm font-semibold">Water Intake</span>
        <span className="text-xs text-muted ml-auto">{glasses}/8 glasses</span>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <button key={i} onClick={() => setGlasses(i < glasses ? i : i + 1)}
            className={`w-8 h-10 rounded-lg border transition-all ${
              i < glasses ? 'bg-blue-500/20 border-blue-500/40' : 'bg-dark-bg border-dark-border hover:border-muted'
            }`}>
            <Droplets size={14} className={`mx-auto ${i < glasses ? 'text-blue-400' : 'text-muted/30'}`} />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Nutrition() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [generatingMeals, setGeneratingMeals] = useState(false)
  const [meals, setMeals] = useState({ breakfast: [], lunch: [], dinner: [], snacks: [] })
  const [foodLog, setFoodLog] = useState([])
  const [glasses, setGlasses] = useState(0)
  const [scanResult, setScanResult] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then(data => {
      setProfile(data.profile)
      if (data.today_meals) {
        setMeals(data.today_meals.meals || meals)
        setFoodLog(data.today_meals.food_log || [])
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  const macros = calcTDEE(profile)
  const loggedCals = foodLog.reduce((s, f) => s + (f.calories || 0), 0)
  const loggedProtein = foodLog.reduce((s, f) => s + (f.protein || 0), 0)
  const loggedCarbs = foodLog.reduce((s, f) => s + (f.carbs || 0), 0)
  const loggedFats = foodLog.reduce((s, f) => s + (f.fats || 0), 0)

  const handleScanFood = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setScanResult(null)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1]
        const data = await scanFood({ user_id: user.id, image: base64 })
        setScanResult(data.analysis)
      } catch {
        setScanResult({ error: 'Could not analyze food' })
      }
      setScanning(false)
    }
    reader.readAsDataURL(file)
  }

  const addScannedFood = () => {
    if (!scanResult || scanResult.error) return
    setFoodLog(prev => [...prev, scanResult])
    setScanResult(null)
    saveMeals({ user_id: user.id, food_log: [...foodLog, scanResult], meals }).catch(() => {})
  }

  const handleGenerateMeals = async () => {
    setGeneratingMeals(true)
    try {
      const data = await generateMeals({ user_id: user.id, ...macros })
      setMeals(data.meals)
      saveMeals({ user_id: user.id, food_log: foodLog, meals: data.meals }).catch(() => {})
    } catch {}
    setGeneratingMeals(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-bg pb-20 md:pb-8">
      <Navbar back="/dashboard/fitness" />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold mb-1">Nutrition</h1>
          <p className="text-sm text-muted">Daily target: {macros.tdee} kcal</p>
        </motion.div>

        {/* Calorie + Macro overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-bold">{loggedCals}</div>
              <div className="text-xs text-muted">/ {macros.tdee} kcal</div>
            </div>
            <div className="flex gap-4">
              <MacroRing label="Protein" current={loggedProtein} target={macros.protein} color="#3B82F6" />
              <MacroRing label="Carbs" current={loggedCarbs} target={macros.carbs} color="#F97316" />
              <MacroRing label="Fats" current={loggedFats} target={macros.fats} color="#22C55E" />
            </div>
          </div>
          <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
            <div className="h-full bg-brand-blue rounded-full transition-all"
              style={{ width: `${Math.min((loggedCals / macros.tdee) * 100, 100)}%` }} />
          </div>
        </motion.div>

        {/* Food scanner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><Camera size={18} /> Scan Food</h3>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleScanFood} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={scanning}
            className="w-full py-3 border-2 border-dashed border-dark-border rounded-xl text-muted hover:text-white hover:border-muted transition-colors flex items-center justify-center gap-2">
            {scanning ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Camera size={16} /> Take Photo or Upload</>}
          </button>

          <AnimatePresence>
            {scanResult && !scanResult.error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-dark-bg rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{scanResult.food_name}</span>
                  <button onClick={() => setScanResult(null)} className="text-muted hover:text-white"><X size={16} /></button>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div><div className="font-bold text-base">{scanResult.calories}</div>kcal</div>
                  <div><div className="font-bold text-base text-brand-blue">{scanResult.protein}g</div>protein</div>
                  <div><div className="font-bold text-base text-brand-orange">{scanResult.carbs}g</div>carbs</div>
                  <div><div className="font-bold text-base text-brand-green">{scanResult.fats}g</div>fats</div>
                </div>
                {scanResult.portion && <p className="text-xs text-muted">Portion: {scanResult.portion}</p>}
                <button onClick={addScannedFood}
                  className="w-full py-2 bg-brand-blue hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors">
                  <Plus size={14} className="inline mr-1" /> Add to Log
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {foodLog.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs text-muted font-medium">Today's Food Log</h4>
              {foodLog.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-dark-bg rounded-lg px-3 py-2">
                  <span>{f.food_name}</span>
                  <span className="text-muted">{f.calories} kcal</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Meal plan */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><Utensils size={18} /> Meal Plan</h3>
            <button onClick={handleGenerateMeals} disabled={generatingMeals}
              className="flex items-center gap-1 text-xs text-brand-blue hover:text-blue-400 transition-colors">
              {generatingMeals ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Generate Plan
            </button>
          </div>

          {['breakfast', 'lunch', 'dinner', 'snacks'].map(slot => (
            <div key={slot}>
              <h4 className="text-xs text-muted font-medium capitalize mb-2">{slot}</h4>
              {(meals[slot] || []).length === 0 ? (
                <p className="text-xs text-muted/50 italic">No meals yet — generate a plan</p>
              ) : (
                <div className="space-y-2">
                  {meals[slot].map((m, i) => (
                    <div key={i} className="bg-dark-bg rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{m.name}</span>
                        <span className="text-xs text-muted">{m.calories} kcal</span>
                      </div>
                      <div className="flex gap-3 text-[10px] text-muted">
                        <span>P: {m.protein}g</span>
                        <span>C: {m.carbs}g</span>
                        <span>F: {m.fats}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Water tracker */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <WaterTracker glasses={glasses} setGlasses={setGlasses} />
        </motion.div>
      </main>
      <BottomNav />
    </div>
  )
}
