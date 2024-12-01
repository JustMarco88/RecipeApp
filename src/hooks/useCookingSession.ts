import { useEffect } from 'react'
import { useCookingStore, type Recipe } from '../store/cookingStore'

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
    toggleIngredient,
    addTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    deleteTimer,
    renameTimer,
    updateTimerRemaining,
  } = useCookingStore()

  // Get current session if exists
  const currentSession = recipe && sessions[recipe.id]
  const isActive = activeSessionId === recipe?.id

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
    isActive,
    currentStep: currentSession?.currentStep ?? 0,
    notes: currentSession?.notes ?? {},
    stepRatings: currentSession?.stepRatings ?? {},
    timers: currentSession?.timers ?? [],

    // Session actions
    startCooking,
    pauseCooking,
    finishCooking,
    resumeSession,

    // Step actions
    setCurrentStep,
    addNote,
    rateStep,
    toggleIngredient,

    // Timer actions
    addTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    deleteTimer,
    renameTimer,
    updateTimerRemaining,
  }
} 