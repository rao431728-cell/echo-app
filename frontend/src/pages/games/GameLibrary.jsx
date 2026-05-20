import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/Navbar'
import { getGameLibrary, deleteGame, playGame } from '../../lib/api'
import { Gamepad2, Play, Trash2, X, Loader2, Library, Sparkles } from 'lucide-react'

export default function GameLibrary() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [playingGame, setPlayingGame] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const iframeRef = useRef(null)

  useEffect(() => {
    if (!user) return
    getGameLibrary(user.id)
      .then(data => setGames(data.games || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !playingGame) return
    iframe.srcdoc = playingGame.html_content
  }, [playingGame])

  const handleDelete = async (gameId) => {
    setDeleting(gameId)
    try {
      await deleteGame({ user_id: user.id, game_id: gameId })
      setGames(prev => prev.filter(g => g.id !== gameId))
    } catch {}
    setDeleting(null)
  }

  const handlePlay = async (game) => {
    setPlayingGame(game)
    try {
      await playGame({ game_id: game.id })
    } catch {}
  }

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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Library size={22} className="text-brand-emerald" />
              <h1 className="text-2xl font-bold">My Games</h1>
            </div>
            <p className="text-sm text-muted">{games.length} game{games.length !== 1 ? 's' : ''} built</p>
          </div>
          <button onClick={() => navigate('/dashboard/games')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all glow-emerald">
            <Sparkles size={14} /> Build New
          </button>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-brand-emerald" />
          </div>
        ) : games.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Gamepad2 size={48} className="text-muted/30 mx-auto mb-4" />
            <p className="text-muted mb-4">No games yet. Build your first one!</p>
            <button onClick={() => navigate('/dashboard/games')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white glow-emerald">
              Build a Game
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game, i) => (
              <motion.div key={game.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4, borderColor: '#10B981' }}
                className="bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 group relative overflow-hidden">
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
                <div className="flex items-center gap-3 text-[11px] text-muted/60 relative">
                  <span>{game.plays || 0} plays</span>
                  <span>{new Date(game.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 mt-auto pt-2 relative">
                  <button onClick={() => handlePlay(game)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold bg-brand-emerald hover:bg-emerald-400 text-white transition-all">
                    <Play size={14} /> Play
                  </button>
                  <button onClick={() => handleDelete(game.id)} disabled={deleting === game.id}
                    className="p-2 rounded-xl text-muted hover:text-red-400 hover:bg-red-500/10 border border-dark-border transition-all disabled:opacity-50">
                    {deleting === game.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

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
