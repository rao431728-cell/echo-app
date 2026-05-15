import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { getChatHistory } from '../../lib/api'
import Navbar from '../../components/Navbar'
import BottomNav from '../../components/BottomNav'
import { Send, Loader2 } from 'lucide-react'

const suggestedPrompts = [
  "What should I eat after my workout?",
  "I'm feeling sore today, should I train?",
  "Give me a quick 10 min warm-up",
  "How can I improve my squat form?",
  "I need motivation today",
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-2 h-2 bg-muted rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </div>
  )
}

export default function Chat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!user) return
    getChatHistory(user.id).then(data => {
      setMessages(data.messages || [])
      setLoadingHistory(false)
    }).catch(() => setLoadingHistory(false))
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim() || streaming) return
    const userMsg = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)

    const assistantMsg = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/fitness/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, message: text.trim() }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                setMessages(prev => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: last.content + parsed.text }
                  }
                  return updated
                })
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = { ...last, content: 'Sorry, I had trouble responding. Try again.' }
        }
        return updated
      })
    }
    setStreaming(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <Navbar back="/dashboard/fitness" />

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {loadingHistory ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand-blue animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">💬</div>
              <h2 className="text-lg font-bold mb-2">Chat with your trainer</h2>
              <p className="text-sm text-muted mb-6">Ask me anything about training, nutrition, or recovery.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedPrompts.map(p => (
                  <button key={p} onClick={() => sendMessage(p)}
                    className="text-xs bg-dark-card border border-dark-border rounded-full px-4 py-2 text-muted hover:text-white hover:border-muted transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-blue text-white'
                    : 'bg-dark-card border border-dark-border text-gray-200'
                }`}>
                  {msg.content || (streaming && i === messages.length - 1 ? <TypingIndicator /> : '')}
                </div>
              </motion.div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="sticky bottom-0 bg-dark-bg/90 backdrop-blur-xl border-t border-dark-border p-4 pb-20 md:pb-4">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex gap-2">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask your trainer anything..."
            disabled={streaming}
            className="flex-1 px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-muted focus:outline-none focus:border-brand-blue transition-colors disabled:opacity-50" />
          <button type="submit" disabled={!input.trim() || streaming}
            className="px-4 py-3 bg-brand-blue hover:bg-blue-600 disabled:opacity-30 text-white rounded-xl transition-colors">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
