import '@testing-library/jest-dom'
import { useCookingStore } from '@/store/cookingStore'
import { act } from '@testing-library/react'

const mockRecipe = {
  id: '1',
  title: 'Test Recipe',
  ingredients: '[]',
  instructions: '[]',
  prepTime: 10,
  cookTime: 20,
  servings: 4,
  difficulty: 'Medium',
  cuisineType: 'Italian',
  tags: [],
  imageUrl: null,
  nutrition: null,
  timers: [],
  userId: 'test-user',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('CookingStore', () => {
  beforeEach(() => {
    // Clear the store before each test
    const store = useCookingStore.getState()
    store.sessions = {}
    store.activeSessionId = null
  })

  it('starts a new cooking session', () => {
    const store = useCookingStore.getState()
    
    act(() => {
      store.startSession(mockRecipe)
    })

    const state = useCookingStore.getState()
    expect(state.activeSessionId).toBe(mockRecipe.id)
    expect(state.sessions[mockRecipe.id]).toBeDefined()
    expect(state.sessions[mockRecipe.id].status).toBe('active')
  })

  it('pauses a cooking session', () => {
    const store = useCookingStore.getState()
    
    act(() => {
      store.startSession(mockRecipe)
      store.pauseSession(mockRecipe.id)
    })

    const state = useCookingStore.getState()
    expect(state.activeSessionId).toBeNull()
    expect(state.sessions[mockRecipe.id].status).toBe('paused')
  })

  it('resumes a cooking session', () => {
    const store = useCookingStore.getState()
    
    act(() => {
      store.startSession(mockRecipe)
      store.pauseSession(mockRecipe.id)
      store.resumeSession(mockRecipe.id)
    })

    const state = useCookingStore.getState()
    expect(state.activeSessionId).toBe(mockRecipe.id)
    expect(state.sessions[mockRecipe.id].status).toBe('active')
  })

  it('ends a cooking session', () => {
    const store = useCookingStore.getState()
    
    act(() => {
      store.startSession(mockRecipe)
      store.setCurrentStep(1) // Progress the session
      store.endSession(mockRecipe.id)
    })

    const state = useCookingStore.getState()
    expect(state.activeSessionId).toBeNull()
    expect(state.sessions[mockRecipe.id]).toBeUndefined()
  })

  it('updates current step', () => {
    const store = useCookingStore.getState()
    
    act(() => {
      store.startSession(mockRecipe)
      store.setCurrentStep(1)
    })

    const state = useCookingStore.getState()
    expect(state.sessions[mockRecipe.id].currentStep).toBe(1)
  })

  it('adds and updates notes', () => {
    const store = useCookingStore.getState()
    
    act(() => {
      store.startSession(mockRecipe)
      store.addNote(0, 'Test note')
    })

    const state = useCookingStore.getState()
    expect(state.sessions[mockRecipe.id].notes[0]).toBe('Test note')
  })

  it('adds and controls timers', () => {
    const store = useCookingStore.getState()
    
    act(() => {
      store.startSession(mockRecipe)
      store.addTimer({ duration: 300, name: 'Test Timer' }, mockRecipe.id)
    })

    const state = useCookingStore.getState()
    const timer = state.sessions[mockRecipe.id].timers[0]
    expect(timer.duration).toBe(300)
    expect(timer.name).toBe('Test Timer')
    expect(timer.isActive).toBe(false)

    act(() => {
      store.startTimer(timer.id)
    })

    const updatedState = useCookingStore.getState()
    expect(updatedState.sessions[mockRecipe.id].timers[0].isActive).toBe(true)
  })

  it('handles ingredient checking', () => {
    const store = useCookingStore.getState()
    
    act(() => {
      store.startSession(mockRecipe)
      store.toggleIngredient(0, mockRecipe.id)
    })

    const state = useCookingStore.getState()
    expect(state.sessions[mockRecipe.id].checkedIngredients[0]).toBe(true)

    act(() => {
      store.toggleIngredient(0, mockRecipe.id)
    })

    const updatedState = useCookingStore.getState()
    expect(updatedState.sessions[mockRecipe.id].checkedIngredients[0]).toBe(false)
  })
}) 