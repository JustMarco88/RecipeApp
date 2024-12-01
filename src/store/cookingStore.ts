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
  toggleIngredient: (index: number, checked: boolean) => void

  // Timer Management
  addTimer: (name: string, duration: number) => void
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

      startSession: (recipe) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [recipe.id]: {
              recipeId: recipe.id,
              currentStep: 0,
              notes: {},
              stepRatings: {},
              timers: [],
              checkedIngredients: {},
              startedAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
              status: 'active',
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
              status: 'paused',
            },
          },
          activeSessionId: null,
        }))
      },

      resumeSession: (recipeId) => {
        set((state) => ({
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

      endSession: (recipeId) => {
        set((state) => {
          const { [recipeId]: session, ...remainingSessions } = state.sessions
          if (session) {
            // For completed sessions, remove from state
            if (session.currentStep > 0) {
              // Session completed - remove it entirely
              return {
                sessions: remainingSessions,
                activeSessionId: null,
              }
            } else {
              // Session abandoned - mark it as abandoned but keep it
              remainingSessions[recipeId] = {
                ...session,
                lastActiveAt: new Date().toISOString(),
                status: 'abandoned',
              }
              return {
                sessions: remainingSessions,
                activeSessionId: null,
              }
            }
          }
          return state
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

      toggleIngredient: (index: number, checked: boolean) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              checkedIngredients: {
                ...sessions[activeSessionId].checkedIngredients,
                [index]: checked,
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
          lastUpdatedAt: new Date().toISOString(),
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
                timer.id === timerId ? { 
                  ...timer, 
                  isActive: true,
                  lastUpdatedAt: new Date().toISOString(),
                } : timer
              ),
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      pauseTimer: (timerId) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        const now = new Date()
        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: sessions[activeSessionId].timers.map((timer) => {
                if (timer.id === timerId && timer.isActive) {
                  const elapsed = Math.floor((now.getTime() - new Date(timer.lastUpdatedAt).getTime()) / 1000)
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

      resetTimer: (timerId) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: sessions[activeSessionId].timers.map((timer) =>
                timer.id === timerId ? {
                  ...timer,
                  remaining: timer.duration,
                  isActive: false,
                  lastUpdatedAt: new Date().toISOString(),
                } : timer
              ),
              lastActiveAt: new Date().toISOString(),
            },
          },
        }))
      },

      deleteTimer: (timerId) => {
        const { activeSessionId, sessions } = get()
        if (!activeSessionId) return

        set((state) => ({
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

        set((state) => ({
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

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...sessions[activeSessionId],
              timers: sessions[activeSessionId].timers.map(t => 
                t.id === timerId ? { 
                  ...t, 
                  remaining,
                  lastUpdatedAt: new Date().toISOString(),
                  isActive: remaining > 0 && t.isActive
                } : t
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
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          try {
            const data = JSON.parse(str)
            // Clean up old sessions and migrate data structure
            if (data.state && data.state.sessions) {
              const now = Date.now()
              const cleanedSessions = Object.entries(data.state.sessions).reduce<{
                [key: string]: CookingSession
              }>(
                (acc, [id, session]: [string, any]) => {
                  const lastActive = new Date(session.lastActiveAt).getTime()
                  const isRecent = now - lastActive < 24 * 60 * 60 * 1000
                  const isValidSession = session.status === 'active' || session.status === 'paused' || session.status === 'completed'
                  
                  if (isRecent && isValidSession) {
                    // Ensure all required fields exist
                    acc[id] = {
                      ...session,
                      checkedIngredients: session.checkedIngredients ?? {},
                      notes: session.notes ?? {},
                      stepRatings: session.stepRatings ?? {},
                      timers: session.timers ?? [],
                    }
                  }
                  return acc
                },
                {}
              )
              data.state.sessions = cleanedSessions
            }
            return data
          } catch (e) {
            console.error('Error parsing stored cooking sessions:', e)
            return null
          }
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
) 