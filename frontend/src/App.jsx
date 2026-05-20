import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { AnimatePresence } from 'framer-motion'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/fitness/Onboarding'
import FitnessHome from './pages/fitness/FitnessHome'
import TodayWorkout from './pages/fitness/TodayWorkout'
import Chat from './pages/fitness/Chat'
import Nutrition from './pages/fitness/Nutrition'
import Progress from './pages/fitness/Progress'
import Program from './pages/fitness/Program'
import StudyHome from './pages/study/StudyHome'
import StudySetup from './pages/study/StudySetup'
import StudyChat from './pages/study/Chat'
import Flashcards from './pages/study/Flashcards'
import MCQQuiz from './pages/study/MCQQuiz'
import RevisionPlan from './pages/study/RevisionPlan'
import UploadNotes from './pages/study/UploadNotes'
import StudyProgress from './pages/study/Progress'
import Websites from './pages/Websites'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/fitness" element={<ProtectedRoute><FitnessHome /></ProtectedRoute>} />
        <Route path="/dashboard/fitness/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/dashboard/fitness/workout" element={<ProtectedRoute><TodayWorkout /></ProtectedRoute>} />
        <Route path="/dashboard/fitness/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/dashboard/fitness/nutrition" element={<ProtectedRoute><Nutrition /></ProtectedRoute>} />
        <Route path="/dashboard/fitness/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/dashboard/fitness/program" element={<ProtectedRoute><Program /></ProtectedRoute>} />
        <Route path="/dashboard/study" element={<ProtectedRoute><StudyHome /></ProtectedRoute>} />
        <Route path="/dashboard/study/setup" element={<ProtectedRoute><StudySetup /></ProtectedRoute>} />
        <Route path="/dashboard/study/chat" element={<ProtectedRoute><StudyChat /></ProtectedRoute>} />
        <Route path="/dashboard/study/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
        <Route path="/dashboard/study/quiz" element={<ProtectedRoute><MCQQuiz /></ProtectedRoute>} />
        <Route path="/dashboard/study/revision" element={<ProtectedRoute><RevisionPlan /></ProtectedRoute>} />
        <Route path="/dashboard/study/upload" element={<ProtectedRoute><UploadNotes /></ProtectedRoute>} />
        <Route path="/dashboard/study/progress" element={<ProtectedRoute><StudyProgress /></ProtectedRoute>} />
        <Route path="/dashboard/websites" element={<ProtectedRoute><Websites /></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  )
}
