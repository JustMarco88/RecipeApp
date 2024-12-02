import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Timer {
  id: string
  name: string
  duration: number
  remaining: number
  isActive: boolean
  lastUpdatedAt: string
}

export interface CookingSession {
  recipeId: string
  currentStep: number
  notes: { [key: number]: string }
  stepRatings: { [key: number]: 'up' | 'down' }
  timers: Timer[]
  checkedIngredients: { [key: number]: boolean }
  startedAt: string
  lastActiveAt: string
  status: 'active' | 'paused' | 'completed' | 'abandoned'
}

export interface Recipe {
  id: string
  title: string
  ingredients: string
  instructions: string
  prepTime: number
  cookTime: number
  servings: number
  difficulty: string
  cuisineType: string | null
  tags: string[]
  imageUrl: string | null
  nutrition: string | null
  timers: string | null
  createdAt: Date
  updatedAt: Date
  userId: string | null
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
  toggleIngredient: (index: number, recipeId: string) => void

  // Timer Management
  addTimer: (timer: { duration: number; name: string }, recipeId: string) => void
  startTimer: (timerId: string) => void
  pauseTimer: (timerId: string) => void
  resetTimer: (timerId: string) => void
  deleteTimer: (timerId: string) => void
  renameTimer: (timerId: string, newName: string) => void
  updateTimerRemaining: (timerId: string, remaining: number) => void
}

export const useCookingStore = create<CookingStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      activeSessionId: null,

      startSession: recipe => {
        console.log('Starting session:', { recipeId: recipe.id })
        set(state => ({
          sessions: {
            ...state.sessions,
            [recipe.id]: {
              recipeId: recipe.id,
              startedAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
              currentStep: 0,
              status: 'active',
              notes: {},
              stepRatings: {},
              timers: [],
              checkedIngredients: {},
            },
          },
          activeSessionId: recipe.id,
        }))
      },

      pauseSession: recipeId => {
        console.log('Pausing session:', { recipeId })
        set(state => ({
          sessions: {
            ...state.sessions,
            [recipeId]: {
              ...state.sessions[recipeId],
              lastActiveAt: new Date().toISOString(),
              status: 'paused',
            },
          },
          activeSessionId: null,
        }))
      },

      resumeSession: recipeId => {
        console.log('Resuming session:', { recipeId })
        set(state => ({
          sessions: {
            ...state.sessions,
            [recipeId]: {
              ...state.sessions[recipeId],
              lastActiveAt: new Date().toISOString(),
              status: 'active',
            },
          },
          activeSessionId: recipeId,
        }))
      },

      endSession: (recipeId: string) => {
        console.log('Ending session:', { recipeId })
        const { sessions } = get()
        const session = sessions[recipeId]
        if (!session) return

        set(state => {
          const { [recipeId]: _, ...remainingSessions } = state.sessions
          return {
            sessions: remainingSessions,
            activeSessionId: null,
          }
        })

        // Save store state to local storage
        const state = get()
        localStorage.setItem(
          'cooking-store',
          JSON.stringify({
            state,
            version: 0,
          })
        )
      },

      setCurrentStep: step => {
        const { activeSessionId, sessions } = get()
        console.log('Setting current step:', {
          step,
          activeSessionId,
          sessionStatus: activeSessionId ? sessions[activeSessionId]?.status : null,
        })
        if (!activeSessionId) return

        set(state => ({
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

        set(state => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              notes: {
                ...sessions[activeSessionId].notes,
                [step]: note,
              },
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      rateStep: (step, rating) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set(state => ({
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

      toggleIngredient: (index: number, recipeId: string) => {
        const { sessions } = get()
        const session = sessions[recipeId]
        if (!session) return

        set(state => ({
          sessions: {
            ...state.sessions,
            [recipeId]: {
              ...session,
              checkedIngredients: {
                ...session.checkedIngredients,
                [index]: !session.checkedIngredients[index],
              },
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      addTimer: (timer: { duration: number; name: string }, recipeId: string) => {
        const { sessions } = get()
        const session = sessions[recipeId]
        if (!session) return

        const newTimer: Timer = {
          id: crypto.randomUUID(),
          name: timer.name,
          duration: timer.duration,
          remaining: timer.duration,
          isActive: false,
          lastUpdatedAt: new Date().toISOString(),
        }

        set(state => ({
          sessions: {
            ...state.sessions,
            [recipeId]: {
              ...session,
              timers: [...session.timers, newTimer],
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      startTimer: timerId => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set(state => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: sessions[activeSessionId].timers.map(timer =>
                timer.id === timerId
                  ? {
                      ...timer,
                      isActive: true,
                      lastUpdatedAt: new Date().toISOString(),
                    }
                  : timer
              ),
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      pauseTimer: timerId => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        const now = new Date()
        set(state => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: sessions[activeSessionId].timers.map(timer => {
                if (timer.id === timerId && timer.isActive) {
                  const elapsed = Math.floor(
                    (now.getTime() - new Date(timer.lastUpdatedAt).getTime()) / 1000
                  )
                  return {
                    ...timer,
                    isActive: false,
                    remaining: Math.max(0, timer.remaining - elapsed),
                    lastUpdatedAt: now.toISOString(),
                  }
                }
                return timer
              }),
              lastActiveAt: now.toISOString(),
            },
          },
        }))
      },

      resetTimer: timerId => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set(state => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: sessions[activeSessionId].timers.map(timer =>
                timer.id === timerId
                  ? {
                      ...timer,
                      remaining: timer.duration,
                      isActive: false,
                      lastUpdatedAt: new Date().toISOString(),
                    }
                  : timer
              ),
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      deleteTimer: timerId => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set(state => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: sessions[activeSessionId].timers.filter(t => t.id !== timerId),
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      renameTimer: (timerId, newName) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set(state => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: sessions[activeSessionId].timers.map(t =>
                t.id === timerId ? { ...t, name: newName } : t
              ),
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      updateTimerRemaining: (timerId, remaining) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set(state => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: sessions[activeSessionId].timers.map(t =>
                t.id === timerId
                  ? {
                      ...t,
                      remaining,
                      lastUpdatedAt: new Date().toISOString(),
                      isActive: remaining > 0 && t.isActive,
                    }
                  : t
              ),
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },
    }),
    {
      name: 'cooking-store',
      storage: {
        getItem: (name: string) => {
          const value = localStorage.getItem(name)
          return value ? JSON.parse(value) : null
        },
        setItem: (name: string, value: unknown) => {
          console.log('Saving cooking store:', { name, value })
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name: string) => localStorage.removeItem(name),
      },
    }
  )
)
