import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Recipe } from '@prisma/client'

interface Timer {
  id: string
  name: string
  duration: number
  remaining: number
  isActive: boolean
}

interface CookingSession {
  recipeId: string
  currentStep: number
  notes: string[]
  stepRatings: { [key: number]: 'up' | 'down' }
  timers: Timer[]
  startedAt: string
  lastActiveAt: string
}

interface CookingStore {
  // Active cooking sessions
  sessions: { [recipeId: string]: CookingSession }
  activeSessionId: string | null

  // Session Actions
  startSession: (recipe: Recipe) => void
  pauseSession: (recipeId: string) => void
  resumeSession: (recipeId: string) => void
  endSession: (recipeId: string) => void

  // Cooking Progress
  setCurrentStep: (step: number) => void
  addNote: (step: number, note: string) => void
  rateStep: (step: number, rating: 'up' | 'down') => void

  // Timer Management
  addTimer: (name: string, duration: number) => void
  startTimer: (timerId: string) => void
  pauseTimer: (timerId: string) => void
  resetTimer: (timerId: string) => void
}

export const useCookingStore = create<CookingStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      activeSessionId: null,

      startSession: (recipe) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [recipe.id]: {
              recipeId: recipe.id,
              currentStep: 0,
              notes: [],
              stepRatings: {},
              timers: [],
              startedAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
            },
          },
          activeSessionId: recipe.id,
        }))
      },

      pauseSession: (recipeId) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [recipeId]: {
              ...state.sessions[recipeId],
              lastActiveAt: new Date().toISOString(),
            },
          },
          activeSessionId: null,
        }))
      },

      resumeSession: (recipeId) => {
        set(() => ({
          activeSessionId: recipeId,
        }))
      },

      endSession: (recipeId) => {
        set((state) => {
          const { [recipeId]: _, ...remainingSessions } = state.sessions
          return {
            sessions: remainingSessions,
            activeSessionId: null,
          }
        })
      },

      setCurrentStep: (step) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              currentStep: step,
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      addNote: (step, note) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              notes: [...sessions[activeSessionId].notes, `Step ${step}: ${note}`],
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      rateStep: (step, rating) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              stepRatings: {
                ...sessions[activeSessionId].stepRatings,
                [step]: rating,
              },
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      addTimer: (name, duration) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        const newTimer: Timer = {
          id: crypto.randomUUID(),
          name,
          duration,
          remaining: duration,
          isActive: false,
        }

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: [...sessions[activeSessionId].timers, newTimer],
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      startTimer: (timerId) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: sessions[activeSessionId].timers.map((timer) =>
                timer.id === timerId ? { ...timer, isActive: true } : timer
              ),
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      pauseTimer: (timerId) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: sessions[activeSessionId].timers.map((timer) =>
                timer.id === timerId ? { ...timer, isActive: false } : timer
              ),
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      resetTimer: (timerId) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: sessions[activeSessionId].timers.map((timer) =>
                timer.id === timerId
                  ? { ...timer, remaining: timer.duration, isActive: false }
                  : timer
              ),
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },
    }),
    {
      name: 'cooking-store',
      // Only persist sessions and activeSessionId
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
) 