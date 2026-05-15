import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { uploadStudyDocument, getStudyDocuments, getStudyProfile, generateFlashcards, generateMCQs } from '../../lib/api'
import Navbar from '../../components/Navbar'
import StudyBottomNav from '../../components/StudyBottomNav'
import { Upload, FileText, Loader2, MessageCircle, Layers, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

export default function UploadNotes() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [uploadedContent, setUploadedContent] = useState('')
  const [uploadedName, setUploadedName] = useState('')
  const [subject, setSubject] = useState('')
  const [expandedDoc, setExpandedDoc] = useState(null)
  const [generating, setGenerating] = useState(null)
  const fileInputRef = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getStudyProfile(user.id),
      getStudyDocuments(user.id),
    ]).then(([sp, docs]) => {
      setProfile(sp.profile)
      setDocuments(docs.documents || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user])

  const handleFile = async (file) => {
    if (!file) return
    setUploading(true)
    setAnalysis(null)

    let content = ''
    const name = file.name

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      content = await file.text()
    } else {
      content = await file.text()
    }

    setUploadedContent(content)
    setUploadedName(name)

    try {
      const res = await uploadStudyDocument({
        user_id: user.id,
        name,
        content: content.slice(0, 50000),
        subject,
      })
      setAnalysis(res.analysis)
      const docs = await getStudyDocuments(user.id)
      setDocuments(docs.documents || [])
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'Unknown error'))
    }
    setUploading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleGenerateCards = async (docContent, docSubject) => {
    setGenerating('flashcards')
    try {
      await generateFlashcards({
        user_id: user.id,
        topic: '',
        subject: docSubject || '',
        document_content: docContent,
        count: 10,
      })
      navigate('/dashboard/study/flashcards')
    } catch {
      alert('Failed to generate flashcards')
    }
    setGenerating(null)
  }

  const handleGenerateMCQs = async (docContent, docSubject) => {
    setGenerating('mcqs')
    try {
      const res = await generateMCQs({
        user_id: user.id,
        topic: '',
        subject: docSubject || '',
        document_content: docContent,
        count: 10,
      })
      navigate('/dashboard/study/quiz')
    } catch {
      alert('Failed to generate MCQs')
    }
    setGenerating(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-bg pb-20 md:pb-8">
      <Navbar back="/dashboard/study" />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold mb-1">Upload Notes 📄</h1>
          <p className="text-muted text-sm">Upload your notes for AI analysis, flashcards, and quizzes</p>
        </motion.div>

        {/* Subject Selector */}
        {profile?.subjects?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.subjects.map(s => (
              <button key={s} onClick={() => setSubject(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  subject === s ? 'bg-brand-purple text-white' : 'bg-dark-card border border-dark-border text-muted'
                }`}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Upload Zone */}
        <div ref={dropRef}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="bg-dark-card border-2 border-dashed border-dark-border rounded-2xl p-10 text-center cursor-pointer hover:border-brand-purple/50 transition-colors">
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.txt,.md,.doc,.docx"
            onChange={e => handleFile(e.target.files[0])} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-brand-purple animate-spin" />
              <p className="text-sm text-muted">Analysing your notes...</p>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="font-semibold mb-1">Drop your notes here</p>
              <p className="text-sm text-muted">or click to browse — PDF, TXT, MD supported</p>
            </>
          )}
        </div>

        {/* Analysis Results */}
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4">
            <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3 text-brand-purple">📝 Summary</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>
            </div>

            {analysis.key_points?.length > 0 && (
              <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
                <h3 className="font-semibold text-sm mb-3 text-brand-purple">🔑 Key Points</h3>
                <ul className="space-y-2">
                  {analysis.key_points.map((p, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-brand-purple mt-1">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.flashcards?.length > 0 && (
              <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
                <h3 className="font-semibold text-sm mb-3 text-brand-purple">🃏 Suggested Flashcards</h3>
                <div className="space-y-2">
                  {analysis.flashcards.map((fc, i) => (
                    <div key={i} className="bg-dark-bg rounded-xl p-3">
                      <div className="text-xs text-muted mb-1">Q:</div>
                      <div className="text-sm mb-2">{fc.question}</div>
                      <div className="text-xs text-muted mb-1">A:</div>
                      <div className="text-sm text-brand-purple">{fc.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => navigate(`/dashboard/study/chat`)}
                className="bg-dark-card border border-dark-border rounded-xl p-3 text-center hover:border-brand-purple/50 transition-colors">
                <MessageCircle size={18} className="text-brand-purple mx-auto mb-1" />
                <span className="text-xs font-medium block">Chat about this</span>
              </button>
              <button onClick={() => handleGenerateMCQs(uploadedContent, subject)}
                disabled={generating === 'mcqs'}
                className="bg-dark-card border border-dark-border rounded-xl p-3 text-center hover:border-brand-purple/50 transition-colors">
                {generating === 'mcqs' ? <Loader2 size={18} className="text-brand-purple mx-auto mb-1 animate-spin" /> :
                  <HelpCircle size={18} className="text-brand-green mx-auto mb-1" />}
                <span className="text-xs font-medium block">Generate MCQs</span>
              </button>
              <button onClick={() => handleGenerateCards(uploadedContent, subject)}
                disabled={generating === 'flashcards'}
                className="bg-dark-card border border-dark-border rounded-xl p-3 text-center hover:border-brand-purple/50 transition-colors">
                {generating === 'flashcards' ? <Loader2 size={18} className="text-amber-400 mx-auto mb-1 animate-spin" /> :
                  <Layers size={18} className="text-amber-400 mx-auto mb-1" />}
                <span className="text-xs font-medium block">Create Cards</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Previous Documents */}
        {documents.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted mb-3">Previous Uploads</h3>
            <div className="space-y-2">
              {documents.map((doc, i) => (
                <div key={doc.id} className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedDoc(expandedDoc === i ? null : i)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-brand-purple" />
                      <div className="text-left">
                        <span className="text-sm font-medium">{doc.name}</span>
                        {doc.subject && <span className="text-xs text-muted ml-2">{doc.subject}</span>}
                      </div>
                    </div>
                    {expandedDoc === i ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                  </button>
                  {expandedDoc === i && (
                    <div className="px-4 pb-3 border-t border-dark-border pt-3">
                      <p className="text-xs text-muted line-clamp-3 mb-3">{doc.content?.slice(0, 200)}...</p>
                      <div className="flex gap-2">
                        <button onClick={() => navigate(`/dashboard/study/chat`)}
                          className="text-xs bg-brand-purple/10 text-brand-purple px-3 py-1.5 rounded-lg font-medium">
                          Chat
                        </button>
                        <button onClick={() => handleGenerateCards(doc.content, doc.subject)}
                          className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg font-medium">
                          Flashcards
                        </button>
                        <button onClick={() => handleGenerateMCQs(doc.content, doc.subject)}
                          className="text-xs bg-brand-green/10 text-brand-green px-3 py-1.5 rounded-lg font-medium">
                          MCQs
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <StudyBottomNav />
    </div>
  )
}
