import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import { Send, Loader2, MessageSquare, X, Sparkles, RotateCcw, ChevronDown, SlidersHorizontal, Check, Download } from 'lucide-react'

const API = 'https://echo-websites-production.up.railway.app'

const AGENTS = [
  { name: 'Layout Architect', icon: '[]' },
  { name: 'Content Writer', icon: 'Aa' },
  { name: 'Style Designer', icon: '<>' },
  { name: 'Component Builder', icon: '{ }' },
  { name: 'Responsive Engineer', icon: '//' },
  { name: 'Performance Optimizer', icon: '%' },
]

const EXAMPLE_PROMPTS = [
  { label: 'SaaS Landing Page', prompt: 'A modern SaaS landing page with hero section, features grid, pricing table, testimonials, and a call-to-action' },
  { label: 'Portfolio', prompt: 'A minimal dark-themed portfolio for a designer with project gallery, about section, and contact form' },
  { label: 'Restaurant', prompt: 'An elegant restaurant website with menu, reservations, photo gallery, and location map' },
  { label: 'Startup', prompt: 'A bold startup one-pager with animated stats, team section, investor logos, and waitlist signup' },
  { label: 'Blog', prompt: 'A clean blog with featured post hero, article cards grid, categories sidebar, and newsletter signup' },
  { label: 'E-commerce', prompt: 'A sleek e-commerce store landing page with product showcases, categories, and promotional banners' },
]

const STYLES = ['Modern', 'Minimal', 'Bold', 'Elegant', 'Playful', 'Corporate']
const COLOR_THEMES = [
  { name: 'Dark', color: '#1a1a1a' },
  { name: 'Light', color: '#f8fafc' },
  { name: 'Blue', color: '#3B82F6' },
  { name: 'Green', color: '#22C55E' },
  { name: 'Purple', color: '#8B5CF6' },
  { name: 'Red', color: '#EF4444' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Custom', color: null },
]
const SECTIONS = ['Hero', 'About', 'Services', 'Portfolio', 'Testimonials', 'Pricing', 'FAQ', 'Contact', 'Blog', 'Team']
const FONT_STYLES = ['Modern Sans', 'Classic Serif', 'Mono', 'Rounded', 'Editorial']
const LAYOUTS = ['Single Page', 'Multi Section', 'Magazine', 'Minimal']

function Particles() {
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * -20,
      opacity: Math.random() * 0.4 + 0.1,
    })), [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.id % 3 === 0 ? '#8B5CF6' : p.id % 3 === 1 ? '#3B82F6' : '#06B6D4',
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -80, 0],
            x: [0, (Math.random() - 0.5) * 60, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function AgentsWorking({ active, statusMessage }) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!active) { setActiveIndex(0); return }
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % AGENTS.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [active])

  if (!active) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl mx-auto mt-10"
    >
      <div className="text-center mb-6">
        <motion.div
          key={statusMessage}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sm font-medium text-blue-300"
        >
          {statusMessage || 'Building your website...'}
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {AGENTS.map((agent, i) => {
          const isActive = i === activeIndex
          const isPast = i < activeIndex || (activeIndex === 0 && i === AGENTS.length - 1 && activeIndex !== i)
          return (
            <motion.div
              key={agent.name}
              animate={isActive ? {
                borderColor: ['rgba(59,130,246,0.2)', 'rgba(139,92,246,0.6)', 'rgba(59,130,246,0.2)'],
                boxShadow: [
                  '0 0 0px rgba(59,130,246,0)',
                  '0 0 20px rgba(139,92,246,0.3)',
                  '0 0 0px rgba(59,130,246,0)',
                ],
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`relative rounded-xl border p-3 text-center transition-all duration-500 ${
                isActive
                  ? 'bg-gradient-to-b from-blue-500/10 to-purple-500/10 border-blue-500/40'
                  : isPast
                    ? 'bg-dark-card/50 border-dark-border/50'
                    : 'bg-dark-card/30 border-dark-border/30'
              }`}
            >
              <div className={`text-xs font-mono mb-1.5 transition-colors duration-500 ${
                isActive ? 'text-blue-400' : 'text-muted/50'
              }`}>
                {agent.icon}
              </div>
              <div className={`text-[11px] font-medium transition-colors duration-500 ${
                isActive ? 'text-white' : 'text-muted/60'
              }`}>
                {agent.name}
              </div>
              {isActive && (
                <motion.div
                  className="absolute -bottom-px left-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                  initial={{ width: 0, x: '-50%' }}
                  animate={{ width: '80%', x: '-50%' }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                />
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

function BrowserFrame({ children, chatOpen }) {
  return (
    <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${chatOpen ? 'lg:mr-[400px]' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-dark-border bg-[#0d0d0d]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 bg-dark-bg/80 rounded-lg px-4 py-1 text-xs text-muted max-w-md w-full justify-center">
            <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            your-website.echo.ai
          </div>
        </div>
        <div className="w-[54px]" />
      </div>
      {children}
    </div>
  )
}

export default function Websites() {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [siteHtml, setSiteHtml] = useState('')
  const [siteId, setSiteId] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [refining, setRefining] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('')
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [style, setStyle] = useState('Modern')
  const [colorTheme, setColorTheme] = useState('Dark')
  const [customColor, setCustomColor] = useState('#6366F1')
  const [sectionCount, setSectionCount] = useState(6)
  const [includeSections, setIncludeSections] = useState(new Set(['Hero', 'About', 'Services', 'Portfolio', 'Testimonials', 'Contact']))
  const [fontStyle, setFontStyle] = useState('Modern Sans')
  const [layout, setLayout] = useState('Single Page')
  const iframeRef = useRef(null)
  const chatBottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !siteHtml) return
    iframe.srcdoc = siteHtml
  }, [siteHtml])

  const toggleSection = (section) => {
    setIncludeSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const buildCustomizeSuffix = () => {
    const parts = []
    parts.push(`Style: ${style}`)
    parts.push(`Colors: ${colorTheme === 'Custom' ? customColor : colorTheme}`)
    if (includeSections.size > 0) {
      parts.push(`Sections (${sectionCount}): ${[...includeSections].join(', ')}`)
    }
    parts.push(`Font: ${fontStyle}`)
    parts.push(`Layout: ${layout}`)
    return parts.join(', ')
  }

  const pollStatus = (jobId) => {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const res = await fetch(`${API}/status/${jobId}`)
          const data = await res.json()
          setGenerationStatus(data.message || '')
          if (data.status === 'complete' || data.status === 'done') {
            resolve(data)
          } else if (data.status === 'failed' || data.status === 'error') {
            reject(new Error(data.message || 'Generation failed'))
          } else {
            setTimeout(poll, 2000)
          }
        } catch (err) {
          reject(err)
        }
      }
      poll()
    })
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return
    setGenerating(true)
    setSiteHtml('')
    setSiteId(null)
    setChatMessages([])
    setChatOpen(false)
    setGenerationStatus('Starting generation...')

    const fullPrompt = `${prompt.trim()}\n\nCustomization — ${buildCustomizeSuffix()}`

    try {
      const res = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt }),
      })
      const data = await res.json()
      const jobId = data.job_id

      if (!jobId) {
        if (data.html) {
          setSiteHtml(data.html)
          setSiteId(data.site_id || data.id || null)
          setChatOpen(true)
          setChatMessages([{ role: 'assistant', content: 'Website generated! Tell me what you\'d like to change — colours, layout, text, sections, anything.' }])
          setGenerating(false)
          return
        }
        throw new Error('No job_id returned')
      }

      setSiteId(jobId)
      const result = await pollStatus(jobId)

      if (result.html) {
        setSiteHtml(result.html)
        setChatOpen(true)
        setChatMessages([{ role: 'assistant', content: 'Website generated! Tell me what you\'d like to change — colours, layout, text, sections, anything.' }])
      }
    } catch {
      setSiteHtml('<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#999;background:#0a0a0a"><p>Generation failed. Try again.</p></body></html>')
    }
    setGenerating(false)
    setGenerationStatus('')
  }

  const handleRefine = async () => {
    if (!chatInput.trim() || refining) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setRefining(true)

    try {
      const res = await fetch(`${API}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_html: siteHtml,
          instruction: userMsg,
        }),
      })
      const data = await res.json()
      if (data.html) {
        setSiteHtml(data.html)
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.message || 'Done! I\'ve updated the website.' }])
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.message || data.error || 'I couldn\'t apply that change. Try rephrasing.' }])
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    }
    setRefining(false)
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .shimmer-btn {
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        .gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 6s ease infinite;
        }
        .glow-pulse {
          animation: glow-pulse 3s ease-in-out infinite;
        }
        .input-glow {
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .input-glow:focus-within {
          box-shadow: 0 0 30px rgba(59,130,246,0.15), 0 0 60px rgba(139,92,246,0.08);
          border-color: rgba(99,102,241,0.5) !important;
        }
        .custom-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          background: linear-gradient(to right, #3B82F6 var(--progress), #1a1a1a var(--progress));
          outline: none;
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 2px solid #3B82F6;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(59,130,246,0.3);
          transition: box-shadow 0.2s;
        }
        .custom-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 14px rgba(59,130,246,0.5);
        }
      `}</style>

      <Navbar back="/dashboard" />

      <AnimatePresence mode="wait">
        {!siteHtml && !generating ? (
          <motion.div
            key="builder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col relative"
          >
            <Particles />

            {/* Hero gradient orbs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none">
              <div className="absolute top-10 left-1/4 w-72 h-72 bg-blue-600/20 rounded-full blur-[120px] glow-pulse" />
              <div className="absolute top-20 right-1/4 w-64 h-64 bg-purple-600/15 rounded-full blur-[100px] glow-pulse" style={{ animationDelay: '1.5s' }} />
              <div className="absolute top-40 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] glow-pulse" style={{ animationDelay: '3s' }} />
            </div>

            <div className="flex-1 flex flex-col items-center px-4 relative z-10 overflow-y-auto py-12">
              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-center mb-10"
              >
                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
                  <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">Echo </span>
                  <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent gradient-shift">Websites</span>
                </h1>
                <p className="text-lg text-muted max-w-md mx-auto">
                  Describe anything. Build in seconds.
                </p>
              </motion.div>

              {/* Input area */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-2xl"
              >
                <div className={`input-glow rounded-2xl border bg-dark-card/80 backdrop-blur-sm overflow-hidden ${
                  inputFocused ? 'border-indigo-500/50' : 'border-dark-border'
                }`}>
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleGenerate() }}
                    placeholder="A modern portfolio with a dark theme, animated hero section, project gallery with hover effects, about me, and a contact form..."
                    rows={4}
                    className="w-full bg-transparent text-white placeholder-muted/60 text-[15px] leading-relaxed resize-none focus:outline-none p-5 pb-3"
                  />

                  {/* Customize toggle */}
                  <button
                    onClick={() => setCustomizeOpen(prev => !prev)}
                    className="mx-5 mb-3 flex items-center gap-2 text-xs font-medium text-muted hover:text-white transition-colors group"
                  >
                    <SlidersHorizontal size={13} className="text-blue-400/70 group-hover:text-blue-400 transition-colors" />
                    <span>Customize</span>
                    <motion.div animate={{ rotate: customizeOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={13} />
                    </motion.div>
                    {customizeOpen ? null : (
                      <span className="text-[10px] text-muted/40 ml-1">
                        {style} / {colorTheme} / {fontStyle}
                      </span>
                    )}
                  </button>

                  {/* Customize panel */}
                  <AnimatePresence>
                    {customizeOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 space-y-5 border-t border-dark-border/50 pt-4">

                          {/* Website Style */}
                          <div>
                            <label className="text-[11px] font-semibold text-muted/70 uppercase tracking-wider mb-2.5 block">Website Style</label>
                            <div className="flex flex-wrap gap-2">
                              {STYLES.map(s => (
                                <button key={s} onClick={() => setStyle(s)}
                                  className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
                                    style === s
                                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/40 text-white shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                                      : 'border-dark-border text-muted hover:text-white hover:border-white/20 bg-dark-bg/50'
                                  }`}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Color Theme */}
                          <div>
                            <label className="text-[11px] font-semibold text-muted/70 uppercase tracking-wider mb-2.5 block">Color Theme</label>
                            <div className="flex flex-wrap items-center gap-2.5">
                              {COLOR_THEMES.map(t => (
                                <div key={t.name} className="flex flex-col items-center gap-1">
                                  <button onClick={() => setColorTheme(t.name)}
                                    className={`relative w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                                      colorTheme === t.name
                                        ? 'border-blue-400 scale-110 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                                        : 'border-dark-border hover:border-white/30 hover:scale-105'
                                    }`}
                                    style={{
                                      background: t.color
                                        ? t.color
                                        : 'conic-gradient(#EF4444, #F97316, #EAB308, #22C55E, #3B82F6, #8B5CF6, #EF4444)',
                                    }}
                                  >
                                    {colorTheme === t.name && (
                                      <Check size={12} className={`absolute inset-0 m-auto ${
                                        t.name === 'Light' ? 'text-gray-800' : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                                      }`} />
                                    )}
                                  </button>
                                  <span className="text-[9px] text-muted/50">{t.name}</span>
                                </div>
                              ))}
                              {colorTheme === 'Custom' && (
                                <input
                                  type="color"
                                  value={customColor}
                                  onChange={e => setCustomColor(e.target.value)}
                                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                                />
                              )}
                            </div>
                          </div>

                          {/* Number of Sections */}
                          <div>
                            <div className="flex items-center justify-between mb-2.5">
                              <label className="text-[11px] font-semibold text-muted/70 uppercase tracking-wider">Number of Sections</label>
                              <span className="text-sm font-bold text-blue-400 tabular-nums">{sectionCount}</span>
                            </div>
                            <input
                              type="range"
                              min={3}
                              max={10}
                              value={sectionCount}
                              onChange={e => setSectionCount(Number(e.target.value))}
                              className="custom-slider w-full"
                              style={{ '--progress': `${((sectionCount - 3) / 7) * 100}%` }}
                            />
                            <div className="flex justify-between mt-1">
                              <span className="text-[9px] text-muted/30">3</span>
                              <span className="text-[9px] text-muted/30">10</span>
                            </div>
                          </div>

                          {/* Include Sections */}
                          <div>
                            <label className="text-[11px] font-semibold text-muted/70 uppercase tracking-wider mb-2.5 block">Include Sections</label>
                            <div className="flex flex-wrap gap-2">
                              {SECTIONS.map(s => {
                                const active = includeSections.has(s)
                                return (
                                  <button key={s} onClick={() => toggleSection(s)}
                                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                                      active
                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                                        : 'border-dark-border/50 text-muted/50 hover:text-muted hover:border-dark-border'
                                    }`}>
                                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-all duration-200 ${
                                      active ? 'bg-blue-500' : 'border border-muted/30'
                                    }`}>
                                      {active && <Check size={9} className="text-white" strokeWidth={3} />}
                                    </div>
                                    {s}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Font Style + Layout row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {/* Font Style */}
                            <div>
                              <label className="text-[11px] font-semibold text-muted/70 uppercase tracking-wider mb-2.5 block">Font Style</label>
                              <div className="relative">
                                <select
                                  value={fontStyle}
                                  onChange={e => setFontStyle(e.target.value)}
                                  className="w-full appearance-none bg-dark-bg/80 border border-dark-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors cursor-pointer"
                                >
                                  {FONT_STYLES.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                  ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                              </div>
                            </div>

                            {/* Layout */}
                            <div>
                              <label className="text-[11px] font-semibold text-muted/70 uppercase tracking-wider mb-2.5 block">Layout</label>
                              <div className="flex flex-wrap gap-1.5">
                                {LAYOUTS.map(l => (
                                  <button key={l} onClick={() => setLayout(l)}
                                    className={`text-[11px] font-medium px-3 py-2 rounded-lg border transition-all duration-200 ${
                                      layout === l
                                        ? 'bg-gradient-to-r from-blue-500/15 to-purple-500/15 border-blue-500/40 text-white'
                                        : 'border-dark-border text-muted hover:text-white hover:border-white/20 bg-dark-bg/50'
                                    }`}>
                                    {l}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Bottom bar */}
                  <div className="px-5 py-3 flex items-center justify-between border-t border-dark-border/30">
                    <span className="text-[11px] text-muted/40 hidden sm:block">
                      {prompt.length > 0 ? `${prompt.length} chars` : 'Cmd+Enter to generate'}
                    </span>
                    <button
                      onClick={handleGenerate}
                      disabled={!prompt.trim()}
                      className="shimmer-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background: !prompt.trim()
                          ? '#333'
                          : 'linear-gradient(90deg, #3B82F6, #8B5CF6, #6366F1, #3B82F6)',
                        backgroundSize: '200% auto',
                      }}
                    >
                      <Sparkles size={15} />
                      Generate
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Example prompts */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap justify-center gap-2 mt-8 max-w-2xl"
              >
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <motion.button
                    key={ex.label}
                    onClick={() => { setPrompt(ex.prompt); textareaRef.current?.focus() }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative text-xs font-medium rounded-full px-4 py-2 border border-dark-border bg-dark-card/60 backdrop-blur-sm text-muted hover:text-white hover:border-blue-500/40 transition-all duration-300"
                  >
                    <span className="relative z-10">{ex.label}</span>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-blue-500/10 transition-all duration-300" />
                  </motion.button>
                ))}
              </motion.div>

              {/* Bottom tagline */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-12 flex items-center gap-3 text-muted/40 text-xs"
              >
                <div className="flex -space-x-1">
                  {AGENTS.map((a, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-dark-border flex items-center justify-center text-[8px] text-muted/60">
                      {a.icon.charAt(0)}
                    </div>
                  ))}
                </div>
                <span>6 AI agents working together</span>
              </motion.div>
            </div>
          </motion.div>
        ) : generating ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-4 relative"
          >
            <Particles />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none">
              <div className="absolute inset-0 bg-blue-600/15 rounded-full blur-[120px] glow-pulse" />
              <div className="absolute inset-8 bg-purple-600/10 rounded-full blur-[80px] glow-pulse" style={{ animationDelay: '1s' }} />
            </div>
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-2"
              >
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  Generating your website
                </h2>
                <p className="text-sm text-muted">Our agents are collaborating to build it</p>
              </motion.div>
              <AgentsWorking active={true} statusMessage={generationStatus} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col lg:flex-row overflow-hidden"
          >
            <BrowserFrame chatOpen={chatOpen}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-dark-border/50 bg-dark-card/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-muted">Live Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setChatOpen(!chatOpen)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-400 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-500/20">
                    <MessageSquare size={12} />
                    Refine
                  </button>
                  <button onClick={() => {
                      const blob = new Blob([siteHtml], { type: 'text/html' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'my-website.html'
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-400 hover:from-green-500/20 hover:to-emerald-500/20 border border-green-500/20">
                    <Download size={12} />
                    Download
                  </button>
                  <button onClick={() => { setSiteHtml(''); setPrompt(''); setChatMessages([]); setChatOpen(false) }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 text-muted hover:text-white transition-colors">
                    <RotateCcw size={12} />
                    New
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 bg-white">
                <iframe
                  ref={iframeRef}
                  title="Website Preview"
                  className="w-full h-full border-0"
                />
              </div>
            </BrowserFrame>

            {/* Refinement Chat Panel */}
            <AnimatePresence>
              {chatOpen && (
                <motion.div
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 400, opacity: 0 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="fixed right-0 top-14 bottom-0 w-full lg:w-[400px] bg-dark-bg/95 backdrop-blur-xl border-l border-dark-border flex flex-col z-40"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
                        <MessageSquare size={13} className="text-blue-400" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold block leading-tight">Refinement Agent</span>
                        <span className="text-[10px] text-muted leading-tight">Edit anything with natural language</span>
                      </div>
                    </div>
                    <button onClick={() => setChatOpen(false)} className="p-1 text-muted hover:text-white transition-colors rounded-lg hover:bg-white/5">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                            : 'bg-dark-card border border-dark-border text-gray-200'
                        }`}>
                          {msg.content}
                        </div>
                      </motion.div>
                    ))}
                    {refining && (
                      <div className="flex justify-start">
                        <div className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3 flex items-center gap-1.5">
                          {[0, 1, 2].map(i => (
                            <motion.div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  <div className="p-3 border-t border-dark-border">
                    <form onSubmit={e => { e.preventDefault(); handleRefine() }} className="flex gap-2">
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Make the hero section bigger..."
                        disabled={refining}
                        className="flex-1 px-3.5 py-2.5 bg-dark-card border border-dark-border rounded-xl text-white text-sm placeholder-muted focus:outline-none focus:border-blue-500/40 transition-all disabled:opacity-50"
                      />
                      <button type="submit" disabled={!chatInput.trim() || refining}
                        className="px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-20 text-white rounded-xl transition-all">
                        <Send size={15} />
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
