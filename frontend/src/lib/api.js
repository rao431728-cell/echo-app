const API = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export function getProfile(userId) {
  return request(`/fitness/profile?user_id=${userId}`)
}

export function saveOnboarding(data) {
  return request('/fitness/onboarding', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getProgram(userId) {
  return request(`/fitness/program?user_id=${userId}`)
}

export function completeWorkout(data) {
  return request('/fitness/complete-workout', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getChatHistory(userId) {
  return request(`/fitness/chat/history?user_id=${userId}`)
}

export function scanFood(data) {
  return request('/fitness/scan-food', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function generateMeals(data) {
  return request('/fitness/generate-meals', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function logWeight(data) {
  return request('/fitness/log-weight', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function saveMeals(data) {
  return request('/fitness/save-meals', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function explainExercise(data) {
  return request('/fitness/explain-exercise', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function adjustProgram(data) {
  return request('/fitness/adjust-program', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Study API

export function getStudyProfile(userId) {
  return request(`/study/profile?user_id=${userId}`)
}

export function saveStudySetup(data) {
  return request('/study/setup', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getStudyChatHistory(userId) {
  return request(`/study/chat/history?user_id=${userId}`)
}

export function uploadStudyDocument(data) {
  return request('/study/upload-document', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function generateFlashcards(data) {
  return request('/study/generate-flashcards', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getFlashcards(userId) {
  return request(`/study/flashcards?user_id=${userId}`)
}

export function reviewFlashcard(data) {
  return request('/study/flashcards/review', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function generateMCQs(data) {
  return request('/study/generate-mcqs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function generateRevisionPlan(data) {
  return request('/study/generate-revision-plan', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function completeStudySession(data) {
  return request('/study/complete-session', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getStudySessions(userId) {
  return request(`/study/sessions?user_id=${userId}`)
}

export function getStudyDocuments(userId) {
  return request(`/study/documents?user_id=${userId}`)
}
