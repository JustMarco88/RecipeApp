import { useEffect } from 'react'
import { useCookingStore } from '../store/cookingStore'
import { Recipe } from '@prisma/client'

export const useCookingSession = (recipe: Recipe | null) => {
  const {
    sessions,
    activeSessionId,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    setCurrentStep,
    addNote,
    rateStep,
    addTimer,
    startTimer,
    pauseTimer,
    resetTimer,
  } = useCookingStore()

  // Get current session if exists
  const currentSession = recipe && sessions[recipe.id]
  const isActiveSession = activeSessionId === recipe?.id

  // Auto-cleanup effect for timers
  useEffect(() => {
    if (!currentSession) return

    const timerInterval = setInterval(() => {
      currentSession.timers.forEach((timer) => {
        if (timer.isActive && timer.remaining > 0) {
          useCookingStore.setState((state) => ({
            sessions: {
              ...state.sessions,
              [currentSession.recipeId]: {
                ...currentSession,
                timers: currentSession.timers.map((t) =>
                  t.id === timer.id
                    ? { ...t, remaining: Math.max(0, t.remaining - 1) }
                    : t
                ),
              },
            },
          }))
        }
      })
    }, 1000)

    return () => clearInterval(timerInterval)
  }, [currentSession])

  const startCooking = () => {
    if (!recipe) return
    if (currentSession) {
      resumeSession(recipe.id)
    } else {
      startSession(recipe)
    }
  }

  const pauseCooking = () => {
    if (!recipe || !currentSession) return
    pauseSession(recipe.id)
  }

  const finishCooking = () => {
    if (!recipe || !currentSession) return
    endSession(recipe.id)
  }

  return {
    // Session state
    session: currentSession,
    isActive: isActiveSession,
    currentStep: currentSession?.currentStep ?? 0,
    notes: currentSession?.notes ?? [],
    stepRatings: currentSession?.stepRatings ?? {},
    timers: currentSession?.timers ?? [],

    // Session actions
    startCooking,
    pauseCooking,
    finishCooking,

    // Step actions
    setCurrentStep,
    addNote,
    rateStep,

    // Timer actions
    addTimer,
    startTimer,
    pauseTimer,
    resetTimer,
  }
} 