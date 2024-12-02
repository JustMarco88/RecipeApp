import '@testing-library/jest-dom'
import { renderHook, act } from '@testing-library/react'
import { useCookingSession } from '@/hooks/useCookingSession'
import { useCookingStore } from '@/store/cookingStore'

describe('useCookingSession', () => {
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
    timers: null,
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    // Clear the store before each test
    const store = useCookingStore.getState()
    store.sessions = {}
    store.activeSessionId = null
  })

  it('starts a new cooking session', () => {
    const { result } = renderHook(() => useCookingSession(mockRecipe))

    act(() => {
      result.current.startCooking()
    })

    expect(result.current.session).toBeDefined()
    expect(result.current.isActive).toBe(true)
    expect(result.current.currentStep).toBe(0)
  })

  it('resumes an existing session', () => {
    // First create a session
    const store = useCookingStore.getState()
    act(() => {
      store.startSession(mockRecipe)
      store.setCurrentStep(1)
      store.pauseSession(mockRecipe.id)
    })

    // Then try to resume it
    const { result } = renderHook(() => useCookingSession(mockRecipe))

    act(() => {
      result.current.startCooking()
    })

    expect(result.current.session).toBeDefined()
    expect(result.current.isActive).toBe(true)
    expect(result.current.currentStep).toBe(1)
  })

  it('handles step navigation', () => {
    const { result } = renderHook(() => useCookingSession(mockRecipe))

    act(() => {
      result.current.startCooking()
      result.current.setCurrentStep(1)
    })

    expect(result.current.currentStep).toBe(1)
  })

  it('manages notes', () => {
    const { result } = renderHook(() => useCookingSession(mockRecipe))

    act(() => {
      result.current.startCooking()
      result.current.addNote(0, 'Test note')
    })

    expect(result.current.notes[0]).toBe('Test note')
  })

  it('manages step ratings', () => {
    const { result } = renderHook(() => useCookingSession(mockRecipe))

    act(() => {
      result.current.startCooking()
      result.current.rateStep(0, 'up')
    })

    expect(result.current.stepRatings[0]).toBe('up')
  })

  it('manages ingredient toggling', () => {
    const { result } = renderHook(() => useCookingSession(mockRecipe))

    act(() => {
      result.current.startCooking()
      result.current.toggleIngredient(0, mockRecipe.id)
    })

    expect(result.current.session?.checkedIngredients[0]).toBe(true)
  })

  it('manages timers', () => {
    const { result } = renderHook(() => useCookingSession(mockRecipe))

    act(() => {
      result.current.startCooking()
      result.current.addTimer({ duration: 300, name: 'Test Timer' }, mockRecipe.id)
    })

    expect(result.current.timers).toHaveLength(1)
    expect(result.current.timers[0].duration).toBe(300)

    const timerId = result.current.timers[0].id

    act(() => {
      result.current.startTimer(timerId)
    })

    expect(result.current.timers[0].isActive).toBe(true)

    act(() => {
      result.current.pauseTimer(timerId)
    })

    expect(result.current.timers[0].isActive).toBe(false)
  })

  it('handles session completion', () => {
    const { result } = renderHook(() => useCookingSession(mockRecipe))

    act(() => {
      result.current.startCooking()
      result.current.finishCooking()
    })

    expect(result.current.session).toBeUndefined()
    expect(result.current.isActive).toBe(false)
  })
}) 