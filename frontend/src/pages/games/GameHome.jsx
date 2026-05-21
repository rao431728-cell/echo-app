import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/Navbar'
import { generateGame, remixGame, playGame } from '../../lib/api'
import { Gamepad2, Sparkles, Send, X, Download, Maximize2, Minimize2, RotateCcw, MessageSquare, Loader2, Library, Compass } from 'lucide-react'

const GENRES = ['Arcade', 'Platformer', 'Puzzle', 'Racing', 'RPG', 'Strategy', 'Endless Runner', 'Other']
const STYLES = ['Retro Pixel', 'Modern Neon', 'Minimal', 'Sci-Fi', 'Fantasy', 'Cute']
const FEATURES = ['Boss Fights', 'Power-ups', 'Leaderboard', 'Story Mode', 'Procedural Levels', 'Physics', 'Time Attack']

const GEN_MESSAGES = [
  'Designing your game world...',
  'Writing the game engine...',
  'Adding enemies and obstacles...',
  'Polishing the visuals...',
  'Adding sound effects...',
  'Testing gameplay...',
  'Your game is ready!',
]

function Particles() {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 1,
      duration: Math.random() * 18 + 12,
      delay: Math.random() * -15,
      opacity: Math.random() * 0.35 + 0.05,
    })), [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.id % 3 === 0 ? '#10B981' : p.id % 3 === 1 ? '#F59E0B' : '#3B82F6', opacity: p.opacity }}
          animate={{ y: [0, -60, 0], x: [0, (Math.random() - 0.5) * 40, 0], opacity: [p.opacity, p.opacity * 2.5, p.opacity] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default function GameHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [genre, setGenre] = useState('')
  const [style, setStyle] = useState('')
  const [features, setFeatures] = useState([])
  const [generating, setGenerating] = useState(false)
  const [genMsgIdx, setGenMsgIdx] = useState(0)
  const [gameHtml, setGameHtml] = useState('')
  const [gameTitle, setGameTitle] = useState('')
  const [gameId, setGameId] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [remixOpen, setRemixOpen] = useState(false)
  const [remixInput, setRemixInput] = useState('')
  const [remixing, setRemixing] = useState(false)
  const [remixMessages, setRemixMessages] = useState([])
  const [inputFocused, setInputFocused] = useState(false)
  const iframeRef = useRef(null)
  const remixBottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!generating) return
    setGenMsgIdx(0)
    const interval = setInterval(() => {
      setGenMsgIdx(prev => {
        if (prev < GEN_MESSAGES.length - 1) return prev + 1
        clearInterval(interval)
        return prev
      })
    }, 3500)
    return () => clearInterval(interval)
  }, [generating])

  useEffect(() => {
    remixBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [remixMessages])

  const gameIframeRef = useCallback((node) => {
    iframeRef.current = node
    if (node && gameHtml) {
      node.srcdoc = gameHtml
    }
  }, [gameHtml])

  const toggleFeature = (f) => {
    setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return
    setGenerating(true)
    setGameHtml('')
    setGameTitle('')
    setGameId(null)
    setRemixMessages([])
    setRemixOpen(false)

    try {
      const data = await generateGame({
        user_id: user.id,
        prompt: prompt.trim(),
        genre,
        style,
        features,
      })
      setGameHtml(data.html)
      setGameTitle(data.title || 'Untitled Game')
      setGameId(data.game_id)
      setRemixOpen(true)
      setRemixMessages([{ role: 'assistant', content: `${data.title || 'Your game'} is ready! Tell me what to change — add enemies, tweak difficulty, change colors, anything.` }])
      if (data.game_id) {
        playGame({ game_id: data.game_id }).catch(() => {})
      }
    } catch (e) {
      const errMsg = e.message || 'Generation failed. Please try again.'
      setGameHtml(`<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;color:#999;background:#0a0a0a;text-align:center;padding:2rem"><div><p style="font-size:18px;margin-bottom:12px;color:#f87171">Generation Failed</p><p style="font-size:14px;max-width:400px;line-height:1.6">${errMsg.replace(/</g, '&lt;')}</p></div></body></html>`)
      setGameTitle('Error')
    }
    setGenerating(false)
  }

  const handleRemix = async () => {
    if (!remixInput.trim() || remixing) return
    const msg = remixInput.trim()
    setRemixInput('')
    setRemixMessages(prev => [...prev, { role: 'user', content: msg }])
    setRemixing(true)

    try {
      const data = await remixGame({
        user_id: user.id,
        game_id: gameId,
        instruction: msg,
        current_html: gameHtml,
      })
      if (data.html) {
        setGameHtml(data.html)
        setRemixMessages(prev => [...prev, { role: 'assistant', content: data.message || 'Done! Game updated.' }])
      } else {
        setRemixMessages(prev => [...prev, { role: 'assistant', content: data.error || 'Could not apply that change. Try rephrasing.' }])
      }
    } catch {
      setRemixMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    }
    setRemixing(false)
  }

  const handleDownload = () => {
    const blob = new Blob([gameHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(gameTitle || 'my-game').toLowerCase().replace(/\s+/g, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFullscreen = () => {
    if (!fullscreen && iframeRef.current) {
      iframeRef.current.requestFullscreen?.() || iframeRef.current.webkitRequestFullscreen?.()
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.()
    }
    setFullscreen(!fullscreen)
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <Navbar back="/dashboard" />

      <AnimatePresence mode="wait">
        {!gameHtml && !generating ? (
          <motion.div key="builder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col relative">
            <Particles />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none">
              <div className="absolute top-10 left-1/4 w-72 h-72 bg-emerald-600/20 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute top-20 right-1/4 w-64 h-64 bg-amber-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />
            </div>

            <div className="flex-1 flex flex-col items-center px-4 relative z-10 overflow-y-auto py-12">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/20 mb-5">
                  <Gamepad2 size={30} className="text-brand-emerald" />
                </div>
                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
                  <span className="bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">Echo </span>
                  <span className="bg-gradient-to-r from-emerald-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent">Game Builder</span>
                </h1>
                <p className="text-lg text-muted max-w-md mx-auto">Describe any game. Play it in seconds.</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="w-full max-w-2xl">
                <div className={`rounded-2xl border bg-dark-card/80 backdrop-blur-sm overflow-hidden transition-all duration-300 ${inputFocused ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.12)]' : 'border-dark-border'}`}>
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleGenerate() }}
                    placeholder="A space shooter where I fight waves of alien ships with power-ups and boss battles..."
                    rows={4}
                    className="w-full bg-transparent text-white placeholder-muted/60 text-[15px] leading-relaxed resize-none focus:outline-none p-5 pb-3"
                  />

                  {/* Genre */}
                  <div className="px-5 pb-3">
                    <label className="text-[11px] font-semibold text-muted/60 uppercase tracking-wider mb-2 block">Genre</label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map(g => (
                        <button key={g} onClick={() => setGenre(genre === g ? '' : g)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${genre === g ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-dark-border text-muted hover:text-white hover:border-white/20 bg-dark-bg/50'}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style */}
                  <div className="px-5 pb-3">
                    <label className="text-[11px] font-semibold text-muted/60 uppercase tracking-wider mb-2 block">Visual Style</label>
                    <div className="flex flex-wrap gap-2">
                      {STYLES.map(s => (
                        <button key={s} onClick={() => setStyle(style === s ? '' : s)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${style === s ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'border-dark-border text-muted hover:text-white hover:border-white/20 bg-dark-bg/50'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="px-5 pb-3">
                    <label className="text-[11px] font-semibold text-muted/60 uppercase tracking-wider mb-2 block">Features</label>
                    <div className="flex flex-wrap gap-2">
                      {FEATURES.map(f => {
                        const active = features.includes(f)
                        return (
                          <button key={f} onClick={() => toggleFeature(f)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${active ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : 'border-dark-border text-muted hover:text-white hover:border-white/20 bg-dark-bg/50'}`}>
                            {f}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Bottom bar */}
                  <div className="px-5 py-3 flex items-center justify-between border-t border-dark-border/30">
                    <div className="flex items-center gap-3">
                      <button onClick={() => navigate('/dashboard/games/library')} className="text-[11px] text-muted/50 hover:text-muted transition-colors flex items-center gap-1">
                        <Library size={12} /> My Games
                      </button>
                      <button onClick={() => navigate('/dashboard/games/explore')} className="text-[11px] text-muted/50 hover:text-muted transition-colors flex items-center gap-1">
                        <Compass size={12} /> Explore
                      </button>
                    </div>
                    <button onClick={handleGenerate} disabled={!prompt.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 glow-emerald disabled:shadow-none"
                      style={!prompt.trim() ? { background: '#333', boxShadow: 'none' } : {}}>
                      <Sparkles size={15} />
                      Build My Game
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Example prompts */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25 }} className="flex flex-wrap justify-center gap-2 mt-8 max-w-2xl">
                {[
                  { label: 'Space Shooter', prompt: 'A space shooter with 3 types of aliens, boss fights every 5 levels, and shield power-ups' },
                  { label: 'Platformer', prompt: 'A platformer where I play as a ninja running between buildings collecting coins while avoiding spikes' },
                  { label: 'Neon Tetris', prompt: 'Tetris but the blocks are neon colored and speed up every 10 lines' },
                  { label: 'Zombie Survival', prompt: 'A top-down zombie survival game where I shoot zombies with different weapons' },
                  { label: 'Snake+', prompt: 'A snake game with power-ups and obstacles that increase every level' },
                  { label: 'Breakout', prompt: 'A breakout/arkanoid clone with power-ups, multiple ball types, and boss bricks' },
                ].map(ex => (
                  <motion.button key={ex.label} onClick={() => { setPrompt(ex.prompt); textareaRef.current?.focus() }}
                    whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
                    className="group relative text-xs font-medium rounded-full px-4 py-2 border border-dark-border bg-dark-card/60 backdrop-blur-sm text-muted hover:text-white hover:border-emerald-500/40 transition-all duration-300">
                    <span className="relative z-10">{ex.label}</span>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/0 to-amber-500/0 group-hover:from-emerald-500/10 group-hover:to-amber-500/10 transition-all duration-300" />
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </motion.div>

        ) : generating ? (
          <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center px-4 relative">
            <Particles />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none">
              <div className="absolute inset-0 bg-emerald-600/15 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute inset-8 bg-amber-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            <div className="relative z-10 text-center">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30 mb-8">
                <Gamepad2 size={36} className="text-brand-emerald" />
              </motion.div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent mb-6">Building your game</h2>
              <div className="h-8">
                <AnimatePresence mode="wait">
                  <motion.p key={genMsgIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}
                    className="text-sm text-emerald-300/80">
                    {GEN_MESSAGES[genMsgIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1 justify-center mt-6">
                {GEN_MESSAGES.map((_, i) => (
                  <motion.div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= genMsgIdx ? 'bg-emerald-500 w-6' : 'bg-dark-border w-3'}`} />
                ))}
              </div>
            </div>
          </motion.div>

        ) : (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Game preview */}
            <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${remixOpen ? 'lg:mr-[400px]' : ''}`}>
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-dark-border bg-dark-card/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-semibold text-white truncate max-w-[200px]">{gameTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setRemixOpen(!remixOpen)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all bg-gradient-to-r from-emerald-500/10 to-amber-500/10 text-emerald-400 hover:from-emerald-500/20 hover:to-amber-500/20 border border-emerald-500/20">
                    <MessageSquare size={12} /> Remix
                  </button>
                  <button onClick={handleFullscreen}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-muted hover:text-white transition-colors hover:bg-white/5">
                    {fullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    {fullscreen ? 'Exit' : 'Fullscreen'}
                  </button>
                  <button onClick={handleDownload}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-400 hover:from-blue-500/20 hover:to-indigo-500/20 border border-blue-500/20">
                    <Download size={12} /> Download
                  </button>
                  <button onClick={() => { setGameHtml(''); setPrompt(''); setRemixMessages([]); setRemixOpen(false) }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 text-muted hover:text-white transition-colors">
                    <RotateCcw size={12} /> New
                  </button>
                </div>
              </div>
              {/* iframe */}
              <div className="flex-1 min-h-0 bg-black">
                <iframe ref={gameIframeRef} title="Game Preview" className="w-full h-full border-0" />
              </div>
            </div>

            {/* Remix panel */}
            <AnimatePresence>
              {remixOpen && (
                <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="fixed right-0 top-14 bottom-0 w-full lg:w-[400px] bg-dark-bg/95 backdrop-blur-xl border-l border-dark-border flex flex-col z-40">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/20 flex items-center justify-center">
                        <Sparkles size={13} className="text-brand-emerald" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold block leading-tight">Game Remix Agent</span>
                        <span className="text-[10px] text-muted leading-tight">Modify your game with natural language</span>
                      </div>
                    </div>
                    <button onClick={() => setRemixOpen(false)} className="p-1 text-muted hover:text-white transition-colors rounded-lg hover:bg-white/5">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {remixMessages.map((msg, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white'
                            : 'bg-dark-card border border-dark-border text-gray-200'
                        }`}>
                          {msg.content}
                        </div>
                      </motion.div>
                    ))}
                    {remixing && (
                      <div className="flex justify-start">
                        <div className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3 flex items-center gap-1.5">
                          {[0, 1, 2].map(i => (
                            <motion.div key={i} className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
                              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={remixBottomRef} />
                  </div>

                  <div className="p-3 border-t border-dark-border">
                    <form onSubmit={e => { e.preventDefault(); handleRemix() }} className="flex gap-2">
                      <input value={remixInput} onChange={e => setRemixInput(e.target.value)}
                        placeholder="Add more enemy types..." disabled={remixing}
                        className="flex-1 px-3.5 py-2.5 bg-dark-card border border-dark-border rounded-xl text-white text-sm placeholder-muted focus:outline-none focus:border-emerald-500/40 transition-all disabled:opacity-50" />
                      <button type="submit" disabled={!remixInput.trim() || remixing}
                        className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-20 text-white rounded-xl transition-all">
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
