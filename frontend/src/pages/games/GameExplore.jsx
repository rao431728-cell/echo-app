import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../components/Navbar'
import { getExploreGames, playGame, getGame } from '../../lib/api'
import { Gamepad2, Play, X, Loader2, Compass, Search, Trophy } from 'lucide-react'

const GENRE_FILTERS = ['All', 'Arcade', 'Platformer', 'Puzzle', 'Racing', 'RPG', 'Strategy', 'Endless Runner']

export default function GameExplore() {
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [playingGame, setPlayingGame] = useState(null)
  const [loadingGame, setLoadingGame] = useState(false)
  const iframeRef = useRef(null)

  useEffect(() => {
    getExploreGames()
      .then(data => setGames(data.games || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !playingGame) return
    iframe.srcdoc = playingGame.html_content
  }, [playingGame])

  const handlePlay = async (game) => {
    setLoadingGame(true)
    try {
      const data = await getGame(game.id)
      setPlayingGame(data.game)
      playGame({ game_id: game.id }).catch(() => {})
    } catch {}
    setLoadingGame(false)
  }

  const filtered = games.filter(g => {
    if (filter !== 'All' && g.genre !== filter) return false
    if (search && !g.title.toLowerCase().includes(search.toLowerCase()) && !g.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const featured = [...games].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 3)

  const genreBadgeColor = (genre) => {
    const colors = {
      'Arcade': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      'Platformer': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      'Puzzle': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      'Racing': 'text-red-400 bg-red-500/10 border-red-500/20',
      'RPG': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      'Strategy': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      'Endless Runner': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    }
    return colors[genre] || 'text-muted bg-white/5 border-dark-border'
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar back="/dashboard/games" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Compass size={22} className="text-brand-emerald" />
            <h1 className="text-2xl font-bold">Explore Games</h1>
          </div>
          <p className="text-sm text-muted">Play games built by the Echo community</p>
        </motion.div>

        {/* Featured */}
        {!loading && featured.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-brand-amber" />
              <h2 className="text-sm font-semibold text-brand-amber uppercase tracking-wider">Most Played</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {featured.map((game, i) => (
                <motion.div key={game.id} whileHover={{ y: -4, borderColor: '#10B981' }}
                  className="bg-gradient-to-b from-dark-card to-dark-bg border border-dark-border rounded-2xl p-5 flex flex-col gap-2 cursor-pointer transition-all relative overflow-hidden"
                  onClick={() => handlePlay(game)}>
                  <div className="absolute top-3 right-3 text-[10px] font-bold text-brand-amber bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    #{i + 1}
                  </div>
                  <h3 className="text-base font-semibold text-white pr-8">{game.title}</h3>
                  <p className="text-xs text-muted line-clamp-2">{game.description}</p>
                  <div className="flex items-center gap-2 mt-auto pt-2 text-[11px] text-muted/60">
                    <span className="text-emerald-400 font-medium">{game.plays || 0} plays</span>
                    {game.genre && <span className={`px-1.5 py-0.5 rounded border text-[9px] ${genreBadgeColor(game.genre)}`}>{game.genre}</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search games..."
              className="w-full pl-9 pr-3 py-2 bg-dark-card border border-dark-border rounded-xl text-sm text-white placeholder-muted focus:outline-none focus:border-emerald-500/40 transition-all" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GENRE_FILTERS.map(g => (
              <button key={g} onClick={() => setFilter(g)}
                className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all ${filter === g ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-dark-border text-muted hover:text-white hover:border-white/20'}`}>
                {g}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-brand-emerald" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Gamepad2 size={48} className="text-muted/30 mx-auto mb-4" />
            <p className="text-muted">{search || filter !== 'All' ? 'No games match your filters.' : 'No games yet. Be the first to build one!'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((game, i) => (
              <motion.div key={game.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4, borderColor: '#10B981' }}
                className="bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col gap-3 transition-all group relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                  style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
                <div className="flex items-start justify-between relative">
                  <h3 className="text-base font-semibold text-white truncate pr-2">{game.title}</h3>
                  {game.genre && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${genreBadgeColor(game.genre)}`}>
                      {game.genre}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted line-clamp-2 relative">{game.description}</p>
                <div className="flex items-center justify-between mt-auto pt-2 relative">
                  <span className="text-[11px] text-muted/60">{game.plays || 0} plays</span>
                  <button onClick={() => handlePlay(game)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-brand-emerald hover:bg-emerald-400 text-white transition-all">
                    <Play size={12} /> Play
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Loading overlay */}
      <AnimatePresence>
        {loadingGame && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-brand-emerald" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen play modal */}
      <AnimatePresence>
        {playingGame && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-dark-card/80 border-b border-dark-border">
              <div className="flex items-center gap-2">
                <Gamepad2 size={16} className="text-brand-emerald" />
                <span className="text-sm font-semibold">{playingGame.title}</span>
              </div>
              <button onClick={() => setPlayingGame(null)} className="p-1.5 text-muted hover:text-white transition-colors rounded-lg hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <iframe ref={iframeRef} title="Game" className="w-full h-full border-0" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
