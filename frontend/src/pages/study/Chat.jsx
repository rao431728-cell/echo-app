import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { getStudyChatHistory } from '../../lib/api'
import Navbar from '../../components/Navbar'
import StudyBottomNav from '../../components/StudyBottomNav'
import { Send, Loader2, Upload, Layers } from 'lucide-react'

const defaultPrompts = [
  "Explain this concept simply",
  "Quiz me on this topic",
  "What are common exam mistakes?",
  "Give me a past paper style question",
  "Create a mind map for this topic",
  "Help me understand this formula",
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

function formatMessage(content) {
  if (!content) return content

  const parts = content.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const lines = part.slice(3, -3).split('\n')
      const lang = lines[0]?.trim()
      const code = lang ? lines.slice(1).join('\n') : lines.join('\n')
      return (
        <pre key={i} className="bg-dark-bg border border-dark-border rounded-lg p-3 my-2 overflow-x-auto text-xs">
          {lang && <div className="text-muted text-[10px] mb-2 uppercase">{lang}</div>}
          <code>{code}</code>
        </pre>
      )
    }

    return part.split('\n').map((line, j) => {
      if (line.match(/^#{1,3}\s/)) {
        const level = line.match(/^(#+)/)[1].length
        const text = line.replace(/^#+\s*/, '')
        const sizes = { 1: 'text-lg font-bold', 2: 'text-base font-semibold', 3: 'text-sm font-semibold' }
        return <div key={`${i}-${j}`} className={`${sizes[level] || sizes[3]} mt-3 mb-1`}>{text}</div>
      }
      if (line.match(/^\d+\.\s/)) {
        return <div key={`${i}-${j}`} className="ml-4 my-0.5">{line}</div>
      }
      if (line.match(/^[-*]\s/)) {
        return <div key={`${i}-${j}`} className="ml-4 my-0.5">• {line.slice(2)}</div>
      }
      if (line.match(/^\*\*.*\*\*$/)) {
        return <div key={`${i}-${j}`} className="font-semibold my-1">{line.replace(/\*\*/g, '')}</div>
      }
      if (line.trim() === '') return <div key={`${i}-${j}`} className="h-2" />
      return <div key={`${i}-${j}`} className="my-0.5">{line.replace(/\*\*(.*?)\*\*/g, (_, t) => t)}</div>
    })
  })
}

export default function StudyChat() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const initialSubject = searchParams.get('subject') || ''
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [documentContext, setDocumentContext] = useState('')
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  const prompts = initialSubject
    ? defaultPrompts.map(p => p.replace('this concept', initialSubject).replace('this topic', initialSubject).replace('this formula', `a ${initialSubject} formula`))
    : defaultPrompts

  useEffect(() => {
    if (!user) return
    getStudyChatHistory(user.id).then(data => {
      setMessages(data.messages || [])
      setLoadingHistory(false)
    }).catch(() => setLoadingHistory(false))
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.type === 'application/pdf') {
      const text = await file.text()
      setDocumentContext(text.slice(0, 8000))
    } else {
      const text = await file.text()
      setDocumentContext(text.slice(0, 8000))
    }
  }

  const sendMessage = async (text) => {
    if (!text.trim() || streaming) return
    const userMsg = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)

    const assistantMsg = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/study/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          message: text.trim(),
          document_context: documentContext,
        }),
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
      <Navbar back="/dashboard/study" />

      {documentContext && (
        <div className="bg-brand-purple/10 border-b border-brand-purple/20 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-brand-purple font-medium">📄 Document attached — tutor has context</span>
          <button onClick={() => setDocumentContext('')} className="text-xs text-muted hover:text-white transition-colors">Remove</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {loadingHistory ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand-purple animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📚</div>
              <h2 className="text-lg font-bold mb-2">Chat with your tutor</h2>
              <p className="text-sm text-muted mb-6">Ask me anything about your subjects. I'll explain, quiz, and help you master it.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {prompts.map(p => (
                  <button key={p} onClick={() => sendMessage(p)}
                    className="text-xs bg-dark-card border border-dark-border rounded-full px-4 py-2 text-muted hover:text-white hover:border-brand-purple/50 transition-colors">
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
                    ? 'bg-brand-purple text-white'
                    : 'bg-dark-card border border-dark-border text-gray-200'
                }`}>
                  {msg.content ? (
                    msg.role === 'assistant' ? formatMessage(msg.content) : msg.content
                  ) : (
                    streaming && i === messages.length - 1 ? <TypingIndicator /> : ''
                  )}
                </div>
              </motion.div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="sticky bottom-0 bg-dark-bg/90 backdrop-blur-xl border-t border-dark-border p-4 pb-20 md:pb-4">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt,.md"
            onChange={handleFileUpload} />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="px-3 py-3 bg-dark-card border border-dark-border hover:border-brand-purple/50 text-muted hover:text-brand-purple rounded-xl transition-colors"
            title="Upload notes">
            <Upload size={18} />
          </button>
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask your tutor anything..."
            disabled={streaming}
            className="flex-1 px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-muted focus:outline-none focus:border-brand-purple transition-colors disabled:opacity-50" />
          <button type="submit" disabled={!input.trim() || streaming}
            className="px-4 py-3 bg-brand-purple hover:bg-purple-600 disabled:opacity-30 text-white rounded-xl transition-colors">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
