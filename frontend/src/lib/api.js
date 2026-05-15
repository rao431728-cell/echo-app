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
